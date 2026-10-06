import { Inject, Injectable, Logger } from "@nestjs/common";
import { createClerkClient } from "@clerk/backend";
import { and, asc, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { DateTime } from "luxon";
import { DB, type Db } from "../../db/db";
import {
  auditLogs,
  bookings,
  disputes,
  files,
  homework,
  lessonPackages,
  lessonReports,
  lessons,
  notifications,
  payments,
  reviews,
  studentProfiles,
  teacherProfiles,
  users,
} from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors";
import type { AuthUser } from "../../auth/decorators";
import { decideCancellation, FREE_CANCELLATION_HOURS } from "../../domain/cancellation";
import { BookingsService } from "../bookings/bookings.service";
import { classroomEarlyMin } from "../lessons/lessons.service";
import type { UpdateProfileDto } from "./student-space.dto";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const HOUR = 3_600_000;
/** A student can report a problem up to 24 h after the lesson ended. */
const DISPUTE_WINDOW_HOURS = 24;

export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz.length > 0;
  } catch {
    return false;
  }
};

/** End of the lesson (start + duration), in SQL. */
const endsAtSql = sql`(${bookings.startsAt} + ${bookings.durationMin} * interval '1 minute')`;
const isUpcoming = (now: Date) => and(inArray(bookings.status, ["pending_payment", "confirmed"]), sql`${endsAtSql} > ${now}`)!;

type BookingRow = typeof bookings.$inferSelect;

/**
 * Data behind the student space (dashboard, lessons, homework, progress, payments, settings).
 * Every query is scoped to the signed-in student.
 */
@Injectable()
export class StudentSpaceService {
  private readonly log = new Logger(StudentSpaceService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bookingsService: BookingsService,
  ) {}

  /* ---------------------------------------------------------------- helpers */
  private async account(userId: string) {
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u) throw notFound("Account");
    return u;
  }

  /** Bookings of the student with their teacher, report / review flags. */
  private bookingRows(where: SQL, order: SQL | SQL[], limit = 100) {
    return this.db
      .select({
        booking: bookings,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        teacherAvatarUrl: users.avatarUrl,
        teacherSlug: teacherProfiles.slug,
        lessonEndedAt: lessons.endedAt,
        reportId: lessonReports.id,
        reviewRating: reviews.rating,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.teacherId))
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, bookings.teacherId))
      .leftJoin(lessons, eq(lessons.bookingId, bookings.id))
      .leftJoin(lessonReports, eq(lessonReports.lessonId, lessons.id))
      .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
      .where(where)
      .orderBy(...(Array.isArray(order) ? order : [order]))
      .limit(limit);
  }

  /** What cancelling now would do (same rules as BookingsService.cancel for the student). */
  cancellationPreview(b: BookingRow, now = this.clock.now()) {
    if (!["pending_payment", "confirmed"].includes(b.status) || now >= b.startsAt) return null;
    const freeUntil = new Date(b.startsAt.getTime() - FREE_CANCELLATION_HOURS * HOUR);
    if (b.status === "pending_payment") return { refundCents: 0, refundMode: "none" as const, fullRefund: true, freeUntil, reason: "Cancelled before payment" };
    const d = decideCancellation({ by: "student", startsAt: b.startsAt, now, paidCents: b.priceCents });
    const fullRefund = now < freeUntil;
    const refundMode = d.refundCents > 0 ? (b.packageId ? ("package_credit" as const) : ("money" as const)) : ("none" as const);
    return { refundCents: d.refundCents, refundMode, fullRefund, freeUntil, reason: d.reason };
  }

  private shape(r: Awaited<ReturnType<StudentSpaceService["bookingRows"]>>[number], now: Date) {
    const b = r.booking;
    const endsAt = new Date(b.startsAt.getTime() + b.durationMin * 60_000);
    const cancel = this.cancellationPreview(b, now);
    return {
      id: b.id,
      type: b.type,
      status: b.status,
      startsAt: b.startsAt,
      endsAt,
      durationMin: b.durationMin,
      priceCents: b.priceCents,
      topic: b.topic,
      packageId: b.packageId,
      cancelledBy: b.cancelledBy,
      cancelledAt: b.cancelledAt,
      opensAt: new Date(b.startsAt.getTime() - classroomEarlyMin() * 60_000),
      closesAt: new Date(endsAt.getTime() + 30 * 60_000),
      teacher: { id: b.teacherId, firstName: r.teacherFirstName, lastName: r.teacherLastName, slug: r.teacherSlug, avatarUrl: r.teacherAvatarUrl },
      hasReport: !!r.reportId,
      myReview: r.reviewRating ? { rating: r.reviewRating } : null,
      canReview: b.status === "completed" && !r.reviewRating,
      canCancel: !!cancel,
      cancellation: cancel,
    };
  }

  private levels(profile: typeof studentProfiles.$inferSelect | undefined) {
    const current = profile?.cefrLevel ?? null;
    const i = current ? CEFR.indexOf(current) : -1;
    return { current, target: i >= 0 ? CEFR[Math.min(i + 1, CEFR.length - 1)] : null, selfLevel: profile?.selfLevel ?? null, placement: profile?.placementStatus ?? "not_started" };
  }

  private async completedStats(studentId: string, tz: string) {
    const rows = await this.db
      .select({ teacherId: bookings.teacherId, startsAt: bookings.startsAt, durationMin: bookings.durationMin })
      .from(bookings)
      .where(and(eq(bookings.studentId, studentId), eq(bookings.status, "completed")));
    const monthStart = DateTime.fromJSDate(this.clock.now()).setZone(tz).startOf("month").toJSDate();
    const minutes = rows.reduce((a, r) => a + r.durationMin, 0);
    const monthMinutes = rows.filter((r) => r.startsAt >= monthStart).reduce((a, r) => a + r.durationMin, 0);
    return {
      rows,
      lessonsCompleted: rows.length,
      hoursStudied: Math.round((minutes / 60) * 10) / 10,
      hoursThisMonth: Math.round((monthMinutes / 60) * 10) / 10,
      teachersCount: new Set(rows.map((r) => r.teacherId)).size,
    };
  }

  private activePackages(studentId: string) {
    return this.db
      .select({
        id: lessonPackages.id,
        lessonCount: lessonPackages.lessonCount,
        lessonsUsed: lessonPackages.lessonsUsed,
        status: lessonPackages.status,
        totalCents: lessonPackages.totalCents,
        createdAt: lessonPackages.createdAt,
        teacher: { id: lessonPackages.teacherId, firstName: users.firstName, lastName: users.lastName, slug: teacherProfiles.slug },
      })
      .from(lessonPackages)
      .innerJoin(users, eq(users.id, lessonPackages.teacherId))
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, lessonPackages.teacherId))
      .where(and(eq(lessonPackages.studentId, studentId), ne(lessonPackages.status, "pending_payment")))
      .orderBy(desc(lessonPackages.createdAt));
  }

  private homeworkRows(studentId: string, where?: SQL) {
    return this.db
      .select({
        id: homework.id,
        description: homework.description,
        dueDate: homework.dueDate,
        status: homework.status,
        submissionUrl: homework.submissionUrl,
        createdAt: homework.createdAt,
        bookingId: bookings.id,
        lessonDate: bookings.startsAt,
        teacher: { id: homework.teacherId, firstName: users.firstName, lastName: users.lastName, slug: teacherProfiles.slug },
      })
      .from(homework)
      .innerJoin(users, eq(users.id, homework.teacherId))
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, homework.teacherId))
      .leftJoin(lessons, eq(lessons.id, homework.lessonId))
      .leftJoin(bookings, eq(bookings.id, lessons.bookingId))
      .where(and(eq(homework.studentId, studentId), where))
      .orderBy(sql`${homework.dueDate} asc nulls last`, desc(homework.createdAt));
  }

  private reportRows(studentId: string, limit: number) {
    return this.db
      .select({
        bookingId: bookings.id,
        date: bookings.startsAt,
        durationMin: bookings.durationMin,
        teacher: { firstName: users.firstName, lastName: users.lastName, slug: teacherProfiles.slug },
        topicsCovered: lessonReports.topicsCovered,
        strengths: lessonReports.strengths,
        developmentAreas: lessonReports.developmentAreas,
        recommendation: lessonReports.recommendation,
        sentAt: lessonReports.sentAt,
      })
      .from(lessonReports)
      .innerJoin(lessons, eq(lessons.id, lessonReports.lessonId))
      .innerJoin(bookings, eq(bookings.id, lessons.bookingId))
      .innerJoin(users, eq(users.id, bookings.teacherId))
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, bookings.teacherId))
      .where(eq(bookings.studentId, studentId))
      .orderBy(desc(bookings.startsAt))
      .limit(limit);
  }

  private paymentRows(studentId: string, limit = 200) {
    return this.db
      .select({
        id: payments.id,
        createdAt: payments.createdAt,
        amountCents: payments.amountCents,
        refundedCents: payments.refundedCents,
        currency: payments.currency,
        status: payments.status,
        provider: payments.provider,
        bookingId: payments.bookingId,
        packageId: payments.packageId,
        bookingType: bookings.type,
        bookingStartsAt: bookings.startsAt,
        packageLessonCount: lessonPackages.lessonCount,
        teacherId: sql<string>`coalesce(${bookings.teacherId}, ${lessonPackages.teacherId})`,
      })
      .from(payments)
      .leftJoin(bookings, eq(bookings.id, payments.bookingId))
      .leftJoin(lessonPackages, eq(lessonPackages.id, payments.packageId))
      .where(and(eq(payments.studentId, studentId), ne(payments.status, "requires_payment")))
      .orderBy(desc(payments.createdAt))
      .limit(limit);
  }

  private async withTeachers<T extends { teacherId: string }>(rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.teacherId).filter(Boolean))];
    const people = ids.length
      ? await this.db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, slug: teacherProfiles.slug })
          .from(users)
          .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
          .where(inArray(users.id, ids))
      : [];
    return rows.map(({ teacherId, ...r }) => {
      const t = people.find((p) => p.id === teacherId);
      return { ...r, teacher: t ? { firstName: t.firstName, lastName: t.lastName, slug: t.slug } : null };
    });
  }

  private async payments(studentId: string, limit?: number) {
    const rows = await this.withTeachers(await this.paymentRows(studentId, limit));
    return rows.map(({ bookingType, bookingStartsAt, packageLessonCount, ...p }) => ({
      ...p,
      what: packageLessonCount ? { kind: "package" as const, lessonCount: packageLessonCount } : { kind: (bookingType ?? "single") as "trial" | "single" | "package", lessonDate: bookingStartsAt },
    }));
  }

  /* --------------------------------------------------------------- overview */
  async overview(student: AuthUser) {
    await this.bookingsService.releaseStaleHolds({ studentId: student.id });
    const now = this.clock.now();
    const u = await this.account(student.id);
    const [profile] = await this.db.select().from(studentProfiles).where(eq(studentProfiles.userId, student.id));
    const stats = await this.completedStats(student.id, u.timezone);
    const packages = await this.activePackages(student.id);
    const upcoming = (await this.bookingRows(and(eq(bookings.studentId, student.id), isUpcoming(now))!, asc(bookings.startsAt), 6)).map((r) => this.shape(r, now));
    const openHomework = await this.homeworkRows(student.id, inArray(homework.status, ["assigned", "submitted"]));
    const [doneCount] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(homework)
      .where(and(eq(homework.studentId, student.id), eq(homework.status, "completed")));
    const [lastReport] = await this.reportRows(student.id, 1);
    const [lastCompleted] = await this.bookingRows(and(eq(bookings.studentId, student.id), eq(bookings.status, "completed"))!, desc(bookings.startsAt), 1);

    return {
      firstName: u.firstName,
      timezone: u.timezone,
      level: this.levels(profile),
      hoursStudied: stats.hoursStudied,
      hoursThisMonth: stats.hoursThisMonth,
      lessonsCompleted: stats.lessonsCompleted,
      teachersCount: stats.teachersCount,
      activePackages: packages
        .filter((p) => p.status === "active" && p.lessonCount > 1)
        .map((p) => ({ id: p.id, teacher: p.teacher, lessonCount: p.lessonCount, lessonsUsed: p.lessonsUsed, remaining: Math.max(p.lessonCount - p.lessonsUsed, 0) })),
      nextLesson: upcoming.find((b) => b.status === "confirmed") ?? null,
      upcoming: upcoming.slice(0, 5),
      homework: openHomework.slice(0, 5),
      homeworkCounts: { open: openHomework.length, done: doneCount?.n ?? 0 },
      lastReport: lastReport ?? null,
      lastTeacher: lastCompleted ? this.shape(lastCompleted, now).teacher : null,
      recentPayments: await this.payments(student.id, 3),
    };
  }

  /* ---------------------------------------------------------------- lessons */
  async lessons(student: AuthUser, scope: "upcoming" | "past") {
    await this.bookingsService.releaseStaleHolds({ studentId: student.id });
    const now = this.clock.now();
    const mine = eq(bookings.studentId, student.id);
    const rows =
      scope === "upcoming"
        ? await this.bookingRows(and(mine, isUpcoming(now))!, asc(bookings.startsAt))
        : await this.bookingRows(and(mine, sql`not (${isUpcoming(now)})`)!, desc(bookings.startsAt));
    return rows.map((r) => this.shape(r, now));
  }

  async lesson(student: AuthUser, bookingId: string) {
    const now = this.clock.now();
    const [row] = await this.bookingRows(eq(bookings.id, bookingId), asc(bookings.startsAt), 1);
    if (!row) throw notFound("Lesson");
    if (row.booking.studentId !== student.id) throw forbidden();
    const b = row.booking;
    const [lesson] = await this.db.select().from(lessons).where(eq(lessons.bookingId, b.id));
    const [report] = lesson
      ? await this.db
          .select({
            topicsCovered: lessonReports.topicsCovered,
            strengths: lessonReports.strengths,
            developmentAreas: lessonReports.developmentAreas,
            homework: lessonReports.homework,
            homeworkDue: lessonReports.homeworkDue,
            recommendation: lessonReports.recommendation,
            sentAt: lessonReports.sentAt,
          })
          .from(lessonReports)
          .where(eq(lessonReports.lessonId, lesson.id))
      : [];
    const [review] = await this.db.select({ rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }).from(reviews).where(eq(reviews.bookingId, b.id));
    const hw = lesson ? await this.homeworkRows(student.id, eq(homework.lessonId, lesson.id)) : [];
    const [dispute] = await this.db
      .select({ id: disputes.id, bookingId: disputes.bookingId, status: disputes.status, reason: disputes.reason, resolution: disputes.resolution, createdAt: disputes.createdAt, resolvedAt: disputes.resolvedAt })
      .from(disputes)
      .where(eq(disputes.bookingId, b.id));
    const endedAt = lesson?.endedAt ?? new Date(b.startsAt.getTime() + b.durationMin * 60_000);
    const disputeUntil = new Date(endedAt.getTime() + DISPUTE_WINDOW_HOURS * HOUR);
    return {
      ...this.shape(row, now),
      lesson: lesson ? { startedAt: lesson.startedAt, endedAt: lesson.endedAt, attendance: lesson.attendance } : null,
      report: report ?? null,
      review: review ?? null,
      homework: hw,
      dispute: dispute ?? null,
      disputeUntil,
      canDispute: !dispute && ["completed", "no_show"].includes(b.status) && now >= endedAt && now < disputeUntil,
    };
  }

  /* --------------------------------------------------------------- homework */
  async homework(student: AuthUser) {
    const rows = await this.homeworkRows(student.id);
    const rank = { assigned: 0, submitted: 1, completed: 2 } as const;
    return rows.sort((a, b) => rank[a.status] - rank[b.status]);
  }

  async setHomeworkStatus(student: AuthUser, id: string, status: "completed" | "assigned") {
    const [hw] = await this.db.select().from(homework).where(eq(homework.id, id));
    if (!hw) throw notFound("Homework");
    if (hw.studentId !== student.id) throw forbidden();
    const [updated] = await this.db.update(homework).set({ status }).where(eq(homework.id, id)).returning();
    return updated;
  }

  /* --------------------------------------------------------------- progress */
  async progress(student: AuthUser) {
    const u = await this.account(student.id);
    const [profile] = await this.db.select().from(studentProfiles).where(eq(studentProfiles.userId, student.id));
    const stats = await this.completedStats(student.id, u.timezone);
    const current = DateTime.fromJSDate(this.clock.now()).setZone(u.timezone).startOf("month");
    const months = Array.from({ length: 6 }, (_, i) => current.minus({ months: 5 - i }));
    const lessonsPerMonth = months.map((m) => {
      const inMonth = stats.rows.filter((r) => {
        const d = DateTime.fromJSDate(r.startsAt).setZone(u.timezone);
        return d.year === m.year && d.month === m.month;
      });
      return { month: m.toFormat("yyyy-MM"), lessons: inMonth.length, minutes: inMonth.reduce((a, r) => a + r.durationMin, 0) };
    });
    const levelHistory = profile?.cefrLevel
      ? [{ source: profile.placementScores && Object.keys(profile.placementScores).length ? ("placement_test" as const) : ("placement" as const), level: profile.cefrLevel, scores: profile.placementScores ?? {}, date: profile.updatedAt }]
      : [];
    return {
      level: this.levels(profile),
      levelHistory,
      lessonsPerMonth,
      totalHours: stats.hoursStudied,
      hoursThisMonth: stats.hoursThisMonth,
      lessonsCompleted: stats.lessonsCompleted,
      teachersCount: stats.teachersCount,
      reports: await this.reportRows(student.id, 50),
    };
  }

  /* --------------------------------------------------------------- payments */
  async paymentsPage(student: AuthUser) {
    const list = await this.payments(student.id);
    const packages = (await this.activePackages(student.id)).map((p) => ({ ...p, remaining: p.status === "active" ? Math.max(p.lessonCount - p.lessonsUsed, 0) : 0 }));
    const spentCents = list.filter((p) => p.status !== "failed").reduce((a, p) => a + p.amountCents - p.refundedCents, 0);
    const refundedCents = list.reduce((a, p) => a + p.refundedCents, 0);
    return { payments: list, packages, totals: { spentCents, refundedCents } };
  }

  /* ---------------------------------------------------------------- profile */
  async profile(userId: string) {
    const u = await this.account(userId);
    return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone, country: u.country, nativeLanguage: u.nativeLanguage, timezone: u.timezone, birthDate: u.birthDate, avatarUrl: u.avatarUrl };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.timezone !== undefined && !isValidTimeZone(dto.timezone)) throw badRequest("Invalid time zone");
    const clean = (v: string | null | undefined) => (v === undefined ? undefined : v === null || v.trim() === "" ? null : v.trim());
    const set = {
      firstName: dto.firstName?.trim() || undefined,
      lastName: dto.lastName?.trim() || undefined,
      phone: clean(dto.phone),
      country: clean(dto.country),
      nativeLanguage: clean(dto.nativeLanguage),
      timezone: dto.timezone,
    };
    const values = Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined));
    if (Object.keys(values).length) await this.db.update(users).set(values).where(eq(users.id, userId));
    return this.profile(userId);
  }

  /**
   * GDPR "delete my account": the person is anonymised (bookings and payments stay for accounting).
   * Refused while a confirmed lesson is still ahead — the student must cancel it first.
   */
  async deleteAccount(user: AuthUser) {
    const now = this.clock.now();
    const [live] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.studentId, user.id), eq(bookings.status, "confirmed"), sql`${endsAtSql} > ${now}`))
      .limit(1);
    if (live) throw conflict("Cancel your upcoming lessons before deleting your account");
    const [u] = await this.db.select().from(users).where(eq(users.id, user.id));
    if (!u) throw notFound("Account");

    await this.db.transaction(async (tx) => {
      // Unpaid holds are released.
      await tx
        .update(bookings)
        .set({ status: "cancelled", cancelledBy: "student", cancelledAt: now, cancelReason: "Account deleted" })
        .where(and(eq(bookings.studentId, user.id), eq(bookings.status, "pending_payment")));
      await tx
        .update(users)
        .set({
          status: "deleted",
          clerkId: `deleted-${u.id}`,
          email: `deleted-${u.id}@amerivo.invalid`,
          firstName: "Deleted",
          lastName: "user",
          phone: null,
          country: null,
          nativeLanguage: null,
          avatarUrl: null,
          birthDate: null,
        })
        .where(eq(users.id, u.id));
      await tx.delete(studentProfiles).where(eq(studentProfiles.userId, u.id));
      await tx.delete(files).where(eq(files.ownerId, u.id));
      await tx.delete(notifications).where(eq(notifications.userId, u.id));
      await tx.insert(auditLogs).values({ actorId: u.id, action: "user.delete_self", entity: "user", entityId: u.id, data: { role: u.role } });
    });

    // The sign-in identity is removed too (best effort: the Amerivo account is already anonymised).
    const devAuth = process.env.DEV_AUTH === "1" && process.env.NODE_ENV !== "production";
    if (!devAuth && process.env.CLERK_SECRET_KEY) {
      try {
        await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }).users.deleteUser(u.clerkId);
      } catch (e) {
        this.log.warn(`Clerk user ${u.clerkId} could not be deleted: ${(e as Error).message}`);
      }
    }
    return { deleted: true };
  }
}
