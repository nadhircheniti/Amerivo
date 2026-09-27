import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { bookings, homework, lessonReports, lessons, reviews, teacherProfiles, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors";
import type { AuthUser } from "../../auth/decorators";
import { DailyService } from "../../integrations/daily.service";
import { NotificationsService } from "../../integrations/notifications.service";
import { BookingsService } from "../bookings/bookings.service";

/**
 * How early the classroom opens before the lesson: 10 minutes by default.
 * CLASSROOM_EARLY_MIN can widen it on the test site (e.g. 1440 = the day before) so testers
 * don't have to wait for the exact time. Capped at 24 hours.
 */
export const classroomEarlyMin = () => {
  const v = Number(process.env.CLASSROOM_EARLY_MIN);
  return Number.isFinite(v) && v >= 0 ? Math.min(v, 1440) : 10;
};

export interface ReportInput {
  topicsCovered: string;
  strengths?: string;
  developmentAreas?: string;
  homework?: string;
  homeworkDue?: string;
  recommendation?: string;
  privateFluency?: number;
  privateAccuracy?: number;
  privateEngagement?: number;
}

@Injectable()
export class LessonsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bookings: BookingsService,
    private readonly daily: DailyService,
    private readonly notifications: NotificationsService,
  ) {}

  private windowFor(b: { startsAt: Date; durationMin: number }) {
    return {
      opensAt: new Date(b.startsAt.getTime() - classroomEarlyMin() * 60_000),
      closesAt: new Date(b.startsAt.getTime() + (b.durationMin + 30) * 60_000),
    };
  }

  /** Everything the classroom page needs before joining (participants only). */
  async classroom(user: AuthUser, bookingId: string) {
    const b = await this.bookings.assertParticipant(user, bookingId);
    const people = await this.db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(inArray(users.id, [b.studentId, b.teacherId]));
    const person = (id: string) => people.find((u) => u.id === id) ?? { id, firstName: "", lastName: "" };
    const [lesson] = await this.db.select({ sharedNotes: lessons.sharedNotes }).from(lessons).where(eq(lessons.bookingId, b.id));
    const { opensAt, closesAt } = this.windowFor(b);
    return {
      bookingId: b.id,
      status: b.status,
      type: b.type,
      topic: b.topic,
      startsAt: b.startsAt,
      durationMin: b.durationMin,
      opensAt,
      closesAt,
      role: user.id === b.teacherId ? "teacher" : user.id === b.studentId ? "student" : "admin",
      teacher: person(b.teacherId),
      student: person(b.studentId),
      notes: lesson?.sharedNotes ?? "",
    };
  }

  /** Returns a Daily.co room URL + meeting token for the student or the teacher of the lesson. */
  async join(user: AuthUser, bookingId: string) {
    const b = await this.bookings.assertParticipant(user, bookingId);
    // Lessons are private: only their teacher and student can enter (not admins).
    if (user.id !== b.studentId && user.id !== b.teacherId) throw forbidden();
    if (b.status !== "confirmed") throw badRequest(`Lesson is ${b.status}`);
    const now = this.clock.now();
    const { opensAt, closesAt } = this.windowFor(b);
    if (now < opensAt) throw badRequest(`The classroom opens at ${opensAt.toISOString()}`);
    if (now > closesAt) throw badRequest("This lesson has ended");

    let [lesson] = await this.db.select().from(lessons).where(eq(lessons.bookingId, b.id));
    if (!lesson?.dailyRoomName) {
      // Daily room names: short and unique per lesson.
      const room = await this.daily.createRoom({ name: `amerivo-${b.id.replace(/-/g, "").slice(0, 24)}`, opensAt, startsAt: b.startsAt, durationMin: b.durationMin });
      [lesson] = await this.db
        .insert(lessons)
        .values({ bookingId: b.id, dailyRoomName: room.name })
        .onConflictDoUpdate({ target: lessons.bookingId, set: { dailyRoomName: room.name } })
        .returning();
    }
    if (user.id === b.teacherId && !lesson.startedAt) await this.db.update(lessons).set({ startedAt: now }).where(eq(lessons.id, lesson.id));

    const { token } = await this.daily.meetingToken({ room: lesson.dailyRoomName!, userName: user.firstName, isOwner: user.id === b.teacherId, exp: closesAt });
    return { roomUrl: await this.daily.roomUrl(lesson.dailyRoomName!), token, lessonId: lesson.id };
  }

  async saveNotes(user: AuthUser, bookingId: string, notes: string) {
    await this.bookings.assertParticipant(user, bookingId);
    return this.db.update(lessons).set({ sharedNotes: notes }).where(eq(lessons.bookingId, bookingId)).returning({ id: lessons.id });
  }

  /** Teacher's end-of-lesson report (spec §12). Also creates the homework item. */
  async submitReport(teacher: AuthUser, bookingId: string, input: ReportInput) {
    const b = await this.bookings.get(bookingId);
    if (b.teacherId !== teacher.id) throw forbidden();
    if (!["completed", "no_show"].includes(b.status)) throw badRequest("End the lesson before writing the report");
    for (const v of [input.privateFluency, input.privateAccuracy, input.privateEngagement]) {
      if (v !== undefined && (v < 1 || v > 5)) throw badRequest("Private ratings must be between 1 and 5");
    }
    const [lesson] = await this.db.select().from(lessons).where(eq(lessons.bookingId, b.id));
    if (!lesson) throw notFound("Lesson");
    const now = this.clock.now();
    const report = await this.db.transaction(async (tx) => {
      const [r] = await tx
        .insert(lessonReports)
        .values({ lessonId: lesson.id, ...input, sentAt: now })
        .onConflictDoUpdate({ target: lessonReports.lessonId, set: { ...input, sentAt: now } })
        .returning();
      if (input.homework) {
        await tx.insert(homework).values({ lessonId: lesson.id, studentId: b.studentId, teacherId: b.teacherId, description: input.homework, dueDate: input.homeworkDue });
      }
      return r;
    });
    await this.notifications.notify(b.studentId, { type: "lesson_summary", title: "Your lesson summary is ready", body: input.recommendation });
    if (input.homework) await this.notifications.notify(b.studentId, { type: "homework_assigned", title: "New homework", body: input.homework });
    return report;
  }

  /** Student view hides the teacher-only private ratings. */
  async reportFor(user: AuthUser, bookingId: string) {
    const b = await this.bookings.assertParticipant(user, bookingId);
    const [row] = await this.db.select({ report: lessonReports }).from(lessonReports).innerJoin(lessons, eq(lessons.id, lessonReports.lessonId)).where(eq(lessons.bookingId, b.id));
    if (!row) throw notFound("Report");
    if (user.id === b.studentId) {
      const { privateFluency: _f, privateAccuracy: _a, privateEngagement: _e, ...pub } = row.report;
      return pub;
    }
    return row.report;
  }

  /** 1–5 star review after a completed lesson; updates the teacher's average (spec §13). */
  async review(student: AuthUser, bookingId: string, rating: number, comment?: string) {
    const b = await this.bookings.get(bookingId);
    if (b.studentId !== student.id) throw forbidden();
    if (b.status !== "completed") throw badRequest("You can review a lesson once it is completed");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest("Rating must be 1–5");
    try {
      return await this.db.transaction(async (tx) => {
        const [r] = await tx.insert(reviews).values({ bookingId, studentId: student.id, teacherId: b.teacherId, rating, comment }).returning();
        const [agg] = await tx
          .select({ avg: sql<number>`round(avg(${reviews.rating}) * 100)::int`, count: sql<number>`count(*)::int` })
          .from(reviews)
          .where(eq(reviews.teacherId, b.teacherId));
        await tx.update(teacherProfiles).set({ ratingAvg: agg.avg, ratingCount: agg.count }).where(eq(teacherProfiles.userId, b.teacherId));
        return r;
      });
    } catch (e) {
      if ((e as { code?: string; cause?: { code?: string } }).code === "23505" || (e as { cause?: { code?: string } }).cause?.code === "23505") throw conflict("You already reviewed this lesson");
      throw e;
    }
  }

  publicReviews(teacherId: string) {
    return this.db
      .select({ rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, firstName: users.firstName, country: users.country })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.studentId))
      .where(and(eq(reviews.teacherId, teacherId)))
      .orderBy(sql`${reviews.createdAt} desc`)
      .limit(20);
  }
}
