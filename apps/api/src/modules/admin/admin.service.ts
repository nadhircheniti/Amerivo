import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { auditLogs, bookings, disputes, earnings, lessons, payments, teacherApplications, teacherProfiles, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, notFound } from "../../common/errors";
import { canAdminRefundAfterLesson } from "../../domain/cancellation";
import type { AuthUser } from "../../auth/decorators";
import { StripeService } from "../../integrations/stripe.service";
import { NotificationsService } from "../../integrations/notifications.service";

type Decision = "approved" | "rejected" | "suspended" | "pending";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly stripe: StripeService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Applications and teachers, with everything the admin needs to decide. */
  async listTeachers(status?: "draft" | "pending" | "approved" | "rejected" | "suspended") {
    const rows = await this.db
      .select({
        id: teacherProfiles.userId,
        slug: teacherProfiles.slug,
        status: teacherProfiles.status,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        country: users.country,
        city: teacherProfiles.city,
        timezone: teacherProfiles.timezone,
        gender: teacherProfiles.gender,
        headline: teacherProfiles.headline,
        bio: teacherProfiles.bio,
        education: teacherProfiles.education,
        yearsExperience: teacherProfiles.yearsExperience,
        specialties: teacherProfiles.specialties,
        teaches: teacherProfiles.teaches,
        languages: teacherProfiles.languages,
        certifications: teacherProfiles.certifications,
        priceCents: teacherProfiles.priceCents,
        offersTrial: teacherProfiles.offersTrial,
        identityStatus: teacherProfiles.identityStatus,
        introVideoUrl: teacherProfiles.introVideoUrl,
        interviewPreference: teacherProfiles.interviewPreference,
        ratingAvgX100: teacherProfiles.ratingAvg,
        lessonsCompleted: teacherProfiles.lessonsCompleted,
        approvedAt: teacherProfiles.approvedAt,
        createdAt: teacherProfiles.createdAt,
      })
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(status ? eq(teacherProfiles.status, status) : undefined)
      .orderBy(desc(teacherProfiles.createdAt));
    if (!rows.length) return [];
    // Latest application event per teacher (submission, interview request, decision, notes).
    const history = await this.db.select().from(teacherApplications).orderBy(desc(teacherApplications.createdAt));
    return rows.map((r) => {
      const mine = history.filter((h) => h.teacherId === r.id);
      const submitted = mine.find((h) => h.submittedAt);
      const decided = mine.find((h) => h.decidedAt);
      const interview = mine.find((h) => h.interviewRequestedAt);
      return {
        ...r,
        submittedAt: submitted?.submittedAt ?? null,
        interviewRequestedAt: interview?.interviewRequestedAt ?? null,
        lastDecision: decided ? { decision: decided.decision, notes: decided.adminNotes, evaluation: decided.evaluation, decidedAt: decided.decidedAt } : null,
      };
    });
  }

  /** Asks the applicant for a video interview (the application stays pending). */
  async requestInterview(admin: AuthUser, teacherId: string, notes?: string) {
    const [t] = await this.db.select({ status: teacherProfiles.status }).from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
    if (!t) throw notFound("Teacher");
    if (t.status !== "pending") throw badRequest("Only pending applications can be invited to an interview");
    const now = this.clock.now();
    await this.db.insert(teacherApplications).values({ teacherId, interviewRequestedAt: now, adminNotes: notes, decidedBy: admin.id });
    await this.db.insert(auditLogs).values({ actorId: admin.id, action: "teacher.interview", entity: "teacher", entityId: teacherId, data: { notes } });
    await this.notifications.notify(teacherId, { type: "teacher_interview", title: "Next step: a short video interview", body: notes });
    return { teacherId, interviewRequestedAt: now };
  }

  /** Approve / reject / suspend / reinstate a teacher, with evaluation scores (spec §4 step 5–6). */
  async decideTeacher(admin: AuthUser, teacherId: string, decision: Decision, p: { evaluation?: Record<string, number>; notes?: string }) {
    const [t] = await this.db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
    if (!t) throw notFound("Teacher");
    if (decision === "approved" && t.identityStatus !== "verified") throw badRequest("Identity must be verified before approval");
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(teacherProfiles)
        .set({ status: decision, approvedAt: decision === "approved" ? now : t.approvedAt })
        .where(eq(teacherProfiles.userId, teacherId));
      if (decision === "approved") await tx.update(users).set({ status: "active" }).where(eq(users.id, teacherId));
      await tx.insert(teacherApplications).values({ teacherId, evaluation: p.evaluation, adminNotes: p.notes, decidedBy: admin.id, decidedAt: now, decision });
      await tx.insert(auditLogs).values({ actorId: admin.id, action: `teacher.${decision}`, entity: "teacher", entityId: teacherId, data: p });
    });
    const titles: Record<Decision, string> = { approved: "Welcome to Amerivo! Your application is approved", rejected: "Update on your Amerivo application", suspended: "Your teacher account is suspended", pending: "Your application is back under review" };
    await this.notifications.notify(teacherId, { type: `teacher_${decision}`, title: titles[decision], body: p.notes });
    return { teacherId, status: decision };
  }

  /**
   * Refund a completed lesson within 24 h after it ended (issue or complaint).
   * When the student opened a dispute in time, the lesson stays refundable after the 24 h
   * (the admin may decide later), no-show lessons included; the dispute is marked refunded.
   */
  async refundCompletedLesson(admin: AuthUser, bookingId: string, reason: string) {
    const [row] = await this.db.select({ b: bookings, l: lessons }).from(bookings).leftJoin(lessons, eq(lessons.bookingId, bookings.id)).where(eq(bookings.id, bookingId));
    if (!row) throw notFound("Booking");
    const { b, l } = row;
    const [dispute] = await this.db.select({ id: disputes.id }).from(disputes).where(and(eq(disputes.bookingId, b.id), eq(disputes.status, "open")));
    const refundable = b.status === "completed" || (dispute && b.status === "no_show");
    const endedAt = l?.endedAt ?? (dispute ? new Date(b.startsAt.getTime() + b.durationMin * 60_000) : null);
    if (!refundable || !endedAt) throw badRequest("Only completed lessons can be refunded here");
    const now = this.clock.now();
    if (!dispute && !canAdminRefundAfterLesson(endedAt, now)) throw badRequest("Refunds are only possible within 24 hours after the lesson");

    const [payment] = await this.db.select().from(payments).where(b.packageId ? eq(payments.packageId, b.packageId) : eq(payments.bookingId, b.id));
    if (payment?.providerRef && b.priceCents > 0) await this.stripe.refund(payment.providerRef, b.priceCents, `admin_refund_${b.id}`);
    await this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: "refunded", cancelReason: reason }).where(eq(bookings.id, b.id));
      await tx.update(earnings).set({ status: "reversed" }).where(eq(earnings.bookingId, b.id));
      if (payment) {
        const refunded = payment.refundedCents + b.priceCents;
        await tx.update(payments).set({ refundedCents: refunded, status: refunded >= payment.amountCents ? "refunded" : "partially_refunded" }).where(eq(payments.id, payment.id));
      }
      if (dispute) await tx.update(disputes).set({ status: "refunded", resolution: reason, resolvedBy: admin.id, resolvedAt: now }).where(eq(disputes.id, dispute.id));
      await tx.insert(auditLogs).values({ actorId: admin.id, action: "booking.refund", entity: "booking", entityId: b.id, data: { reason, amountCents: b.priceCents, disputeId: dispute?.id } });
    });
    await this.notifications.notify(b.studentId, { type: "refund", title: "Your lesson was refunded", body: reason });
    return { refunded: b.priceCents };
  }

  async setUserStatus(admin: AuthUser, userId: string, status: "active" | "blocked") {
    const [u] = await this.db.update(users).set({ status }).where(eq(users.id, userId)).returning({ id: users.id, status: users.status });
    if (!u) throw notFound("User");
    await this.db.insert(auditLogs).values({ actorId: admin.id, action: `user.${status}`, entity: "user", entityId: userId });
    return u;
  }

  /** KPIs for the analytics screen (spec §16). */
  async analytics(days = 30) {
    const since = new Date(this.clock.now().getTime() - days * 86_400_000);
    const [[students], [activeStudents], [teachers], [revenue], [completed], [commission]] = await Promise.all([
      this.db.select({ n: count() }).from(users).where(eq(users.role, "student")),
      this.db.select({ n: sql<number>`count(distinct ${bookings.studentId})::int` }).from(bookings).where(gte(bookings.createdAt, since)),
      this.db.select({ n: count() }).from(teacherProfiles).where(eq(teacherProfiles.status, "approved")),
      this.db.select({ cents: sum(payments.amountCents) }).from(payments).where(and(eq(payments.status, "succeeded"), gte(payments.createdAt, since))),
      this.db.select({ n: count() }).from(bookings).where(and(eq(bookings.status, "completed"), gte(bookings.startsAt, since))),
      this.db.select({ cents: sum(earnings.commissionCents) }).from(earnings).where(gte(earnings.createdAt, since)),
    ]);
    // Conversion: students whose trial was followed by a paid booking with anyone.
    const [conv] = await this.db.execute<{ trials: number; converted: number }>(sql`
      select count(distinct t.student_id)::int as trials,
             count(distinct p.student_id)::int as converted
      from bookings t
      left join bookings p on p.student_id = t.student_id and p.type <> 'trial' and p.status in ('confirmed','completed')
      where t.type = 'trial' and t.created_at >= ${since}`).then((r) => (r as unknown as { rows: { trials: number; converted: number }[] }).rows);
    const [ret] = await this.db.execute<{ total: number; returning: number }>(sql`
      select count(*)::int as total, count(*) filter (where n > 1)::int as returning
      from (select student_id, count(*) n from bookings where status = 'completed' group by student_id) s`).then((r) => (r as unknown as { rows: { total: number; returning: number }[] }).rows);
    const pendingApplications = await this.db.select({ n: count() }).from(teacherProfiles).where(eq(teacherProfiles.status, "pending"));
    return {
      periodDays: days,
      totalStudents: students.n,
      activeStudents: activeStudents.n,
      totalTeachers: teachers.n,
      pendingApplications: pendingApplications[0].n,
      revenueCents: Number(revenue.cents ?? 0),
      commissionCents: Number(commission.cents ?? 0),
      lessonsCompleted: completed.n,
      conversionRate: conv?.trials ? conv.converted / conv.trials : null,
      retentionRate: ret?.total ? ret.returning / ret.total : null,
    };
  }
}
