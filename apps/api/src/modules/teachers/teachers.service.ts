import { Inject, Injectable } from "@nestjs/common";
import { and, arrayOverlaps, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { availabilityRules, blockedDates, bookings, teacherProfiles, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, notFound } from "../../common/errors";
import { generateSlots } from "../../domain/availability";
import { LESSON_MINUTES, TRIAL_MINUTES } from "../../domain/pricing";

export interface TeacherSearch {
  specialties?: string[];
  teaches?: string[];
  maxPriceCents?: number;
  gender?: "female" | "male";
  sort?: "best" | "rating" | "price_asc" | "experience";
  limit?: number;
  offset?: number;
}

@Injectable()
export class TeachersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private readonly publicColumns = {
    id: teacherProfiles.userId,
    slug: teacherProfiles.slug,
    firstName: users.firstName,
    lastName: users.lastName,
    avatarUrl: users.avatarUrl,
    headline: teacherProfiles.headline,
    bio: teacherProfiles.bio,
    city: teacherProfiles.city,
    timezone: teacherProfiles.timezone,
    yearsExperience: teacherProfiles.yearsExperience,
    specialties: teacherProfiles.specialties,
    teaches: teacherProfiles.teaches,
    languages: teacherProfiles.languages,
    certifications: teacherProfiles.certifications,
    priceCents: teacherProfiles.priceCents,
    offersTrial: teacherProfiles.offersTrial,
    offersPack5: teacherProfiles.offersPack5,
    offersPack10: teacherProfiles.offersPack10,
    introVideoUrl: teacherProfiles.introVideoUrl,
    ratingAvgX100: teacherProfiles.ratingAvg,
    ratingCount: teacherProfiles.ratingCount,
    lessonsCompleted: teacherProfiles.lessonsCompleted,
  };

  /** Public search: only approved, active teachers. */
  search(q: TeacherSearch) {
    const where = [eq(teacherProfiles.status, "approved"), eq(users.status, "active")];
    if (q.specialties?.length) where.push(arrayOverlaps(teacherProfiles.specialties, q.specialties));
    if (q.teaches?.length) where.push(arrayOverlaps(teacherProfiles.teaches, q.teaches));
    if (q.maxPriceCents) where.push(lte(teacherProfiles.priceCents, q.maxPriceCents));
    if (q.gender) where.push(eq(teacherProfiles.gender, q.gender));
    const order = {
      best: [desc(teacherProfiles.ratingAvg), desc(teacherProfiles.ratingCount)],
      rating: [desc(teacherProfiles.ratingAvg)],
      price_asc: [asc(teacherProfiles.priceCents)],
      experience: [desc(teacherProfiles.yearsExperience)],
    }[q.sort ?? "best"];
    return this.db
      .select(this.publicColumns)
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(and(...where))
      .orderBy(...order)
      .limit(Math.min(q.limit ?? 20, 50))
      .offset(q.offset ?? 0);
  }

  async bySlug(slug: string) {
    const [t] = await this.db
      .select(this.publicColumns)
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(and(eq(teacherProfiles.slug, slug), eq(teacherProfiles.status, "approved")))
      .limit(1);
    if (!t) throw notFound("Teacher");
    return t;
  }

  /** Everything the slot generator needs for one teacher. */
  async scheduleContext(teacherId: string, from: Date, to: Date) {
    const [profile] = await this.db
      .select({ timezone: teacherProfiles.timezone, vacationMode: teacherProfiles.vacationMode })
      .from(teacherProfiles)
      .where(eq(teacherProfiles.userId, teacherId));
    if (!profile) throw notFound("Teacher");
    const [rules, blocked, busy] = await Promise.all([
      this.db.select().from(availabilityRules).where(eq(availabilityRules.teacherId, teacherId)),
      this.db.select().from(blockedDates).where(eq(blockedDates.teacherId, teacherId)),
      this.db
        .select({ startsAt: bookings.startsAt, durationMin: bookings.durationMin })
        .from(bookings)
        .where(
          and(
            eq(bookings.teacherId, teacherId),
            inArray(bookings.status, ["pending_payment", "confirmed"]),
            gte(bookings.startsAt, new Date(from.getTime() - 24 * 3600_000)),
            lte(bookings.startsAt, to),
          ),
        ),
    ]);
    return { teacherTz: profile.timezone, vacationMode: profile.vacationMode, rules, blocked, busy };
  }

  async slots(slug: string, p: { viewerTz: string; from: Date; to: Date; trial?: boolean }) {
    const t = await this.bySlug(slug);
    if (p.trial && !t.offersTrial) throw badRequest("This teacher does not offer trial lessons");
    const ctx = await this.scheduleContext(t.id, p.from, p.to);
    return generateSlots({
      ...ctx,
      viewerTz: p.viewerTz,
      from: p.from,
      to: p.to,
      now: this.clock.now(),
      durationMin: p.trial ? TRIAL_MINUTES : LESSON_MINUTES,
    });
  }

  /** Teacher edits their weekly availability (replaces all rules). */
  async replaceRules(teacherId: string, rules: { weekday: number; startMinute: number; endMinute: number }[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(availabilityRules).where(eq(availabilityRules.teacherId, teacherId));
      if (rules.length) await tx.insert(availabilityRules).values(rules.map((r) => ({ ...r, teacherId })));
    });
    return this.db.select().from(availabilityRules).where(eq(availabilityRules.teacherId, teacherId));
  }

  setVacation(teacherId: string, on: boolean) {
    return this.db.update(teacherProfiles).set({ vacationMode: on }).where(eq(teacherProfiles.userId, teacherId)).returning({ vacationMode: teacherProfiles.vacationMode });
  }

  addBlockedDate(teacherId: string, b: { startDate: string; endDate: string; reason?: string }) {
    return this.db.insert(blockedDates).values({ ...b, teacherId }).returning();
  }

  removeBlockedDate(teacherId: string, id: string) {
    return this.db.delete(blockedDates).where(and(eq(blockedDates.id, id), eq(blockedDates.teacherId, teacherId))).returning({ id: blockedDates.id });
  }

  /** "Returning student" reminder data for the teacher dashboard (spec §2 Teacher). */
  async historyWithStudent(teacherId: string, studentId: string) {
    const [row] = await this.db
      .select({
        lessons: sql<number>`count(*)::int`,
        minutes: sql<number>`coalesce(sum(${bookings.durationMin}),0)::int`,
        last: sql<Date | null>`max(${bookings.startsAt})`,
      })
      .from(bookings)
      .where(and(eq(bookings.teacherId, teacherId), eq(bookings.studentId, studentId), eq(bookings.status, "completed")));
    return { lessons: row.lessons, hours: Math.round((row.minutes / 60) * 10) / 10, lastLessonAt: row.last };
  }
}
