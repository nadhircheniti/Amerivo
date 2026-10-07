import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DB, type Db } from "../../db/db";
import { auditLogs, bookings, disputes, earnings, lessonPackages, lessons, payments, payouts, studentProfiles, teacherProfiles, users, supportMessages, moderationFlags, teachingMaterials } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { notFound } from "../../common/errors";
import { MIN_STUDENT_AGE } from "../../domain/age";
import { ADMIN_REFUND_WINDOW_HOURS, canAdminRefundAfterLesson, FREE_CANCELLATION_HOURS, TEACHER_WARNING_THRESHOLD, TEACHER_WARNING_WINDOW_DAYS } from "../../domain/cancellation";
import { COMMISSION_RATE, MIN_WITHDRAWAL_CENTS, MONTHLY_PAYOUT_DAY, nextMonthlyPayoutDate } from "../../domain/earnings";
import { PAYMENT_HOLD_MIN } from "../../domain/holds";
import { LESSON_MINUTES, MAX_PRICE_CENTS, MIN_PRICE_CENTS, TRIAL_MINUTES } from "../../domain/pricing";
import { AdminService } from "../admin/admin.service";
import { lessonEnd } from "../disputes/disputes.service";

type BookingStatus = (typeof bookings.$inferSelect)["status"];
type PaymentStatus = (typeof payments.$inferSelect)["status"];
type UserStatus = (typeof users.$inferSelect)["status"];

export const BOOKING_STATUSES: BookingStatus[] = ["pending_payment", "confirmed", "completed", "cancelled", "refunded", "no_show"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["requires_payment", "succeeded", "failed", "refunded", "partially_refunded"];
export const STUDENT_STATUSES: UserStatus[] = ["pending_verification", "active", "blocked", "deleted"];

/** Payments that brought money in (net of refunds = amount − refunded). */
const COLLECTED: PaymentStatus[] = ["succeeded", "partially_refunded", "refunded"];

export const BOOKINGS_PAGE_SIZE = 20;
export const STUDENTS_PAGE_SIZE = 25;
export const PAYMENTS_PAGE_SIZE = 20;
export const PAYOUTS_PAGE_SIZE = 20;
export const AUDIT_PAGE_SIZE = 30;

const name = (u: { firstName: string | null; lastName: string | null } | null) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : null);
const like = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const pageOf = (page: number | undefined) => (Number.isFinite(page) && page! > 0 ? Math.floor(page!) : 1);

export interface BookingFilters {
  status?: BookingStatus | "disputed";
  from?: Date;
  to?: Date;
  search?: string;
  studentId?: string;
  page?: number;
  pageSize?: number;
  sort?: "startsAt" | "createdAt";
}

/** Read models for the admin screens (overview, students, bookings, payments, audit log, settings). */
@Injectable()
export class AdminSpaceService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly admin: AdminService,
  ) {}

  /* ---------------------------------------------------------------- overview */
  async overview(days = 30) {
    const now = this.clock.now();
    const since = new Date(now.getTime() - days * 86_400_000);
    const a = await this.admin.analytics(days);

    const [[revenue], [commission], [lessonsAll], [owed], [openDisputes], [dueTeachers]] = await Promise.all([
      this.db
        .select({ cents: sql<number>`coalesce(sum(${payments.amountCents} - ${payments.refundedCents}), 0)::int` })
        .from(payments)
        .where(and(inArray(payments.status, COLLECTED), gte(payments.createdAt, since))),
      this.db
        .select({ cents: sql<number>`coalesce(sum(${earnings.commissionCents}), 0)::int` })
        .from(earnings)
        .where(and(ne(earnings.status, "reversed"), gte(earnings.createdAt, since))),
      this.db.select({ n: count() }).from(bookings).where(eq(bookings.status, "completed")),
      this.db
        .select({
          available: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} = 'available'), 0)::int`,
          pending: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} = 'pending'), 0)::int`,
        })
        .from(earnings)
        .where(inArray(earnings.status, ["available", "pending"])),
      this.db.select({ n: count() }).from(disputes).where(eq(disputes.status, "open")),
      this.db
        .select({ n: sql<number>`count(distinct ${earnings.teacherId})::int` })
        .from(earnings)
        .where(inArray(earnings.status, ["available", "pending"])),
    ]);

    return {
      periodDays: days,
      totalStudents: a.totalStudents,
      activeStudents: a.activeStudents,
      activeTeachers: a.totalTeachers,
      pendingApplications: a.pendingApplications,
      lessonsCompleted: a.lessonsCompleted,
      lessonsCompletedAllTime: lessonsAll.n,
      revenueCents: revenue.cents,
      commissionCents: commission.cents,
      commissionRate: COMMISSION_RATE,
      retentionRate: a.retentionRate,
      conversionRate: a.conversionRate,
      payoutsDue: { cents: owed.available + owed.pending, availableCents: owed.available, pendingCents: owed.pending, teachers: dueTeachers.n, date: nextMonthlyPayoutDate(now) },
      openDisputes: openDisputes.n,
      months: await this.monthly(now),
      latestBookings: (await this.bookings({ page: 1, pageSize: 5, sort: "createdAt" })).items,
    };
  }

  /** Revenue (net of refunds) and completed lessons for the last 12 months, oldest first (UTC). */
  private async monthly(now: Date) {
    const keys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    const start = new Date(`${keys[0]}-01T00:00:00Z`);
    const payMonth = sql<string>`to_char(${payments.createdAt} at time zone 'UTC', 'YYYY-MM')`;
    const lessonMonth = sql<string>`to_char(${bookings.startsAt} at time zone 'UTC', 'YYYY-MM')`;
    const [rev, les] = await Promise.all([
      this.db
        .select({ month: payMonth, cents: sql<number>`coalesce(sum(${payments.amountCents} - ${payments.refundedCents}), 0)::int` })
        .from(payments)
        .where(and(inArray(payments.status, COLLECTED), gte(payments.createdAt, start)))
        .groupBy(payMonth),
      this.db
        .select({ month: lessonMonth, n: sql<number>`count(*)::int` })
        .from(bookings)
        .where(and(eq(bookings.status, "completed"), gte(bookings.startsAt, start)))
        .groupBy(lessonMonth),
    ]);
    return keys.map((month) => ({
      month,
      revenueCents: rev.find((r) => r.month === month)?.cents ?? 0,
      lessons: les.find((r) => r.month === month)?.n ?? 0,
    }));
  }

  /* ---------------------------------------------------------------- bookings */
  async bookings(f: BookingFilters = {}) {
    const now = this.clock.now();
    const page = pageOf(f.page);
    const pageSize = f.pageSize ?? BOOKINGS_PAGE_SIZE;
    const student = alias(users, "student");
    const teacher = alias(users, "teacher");

    const conds: (SQL | undefined)[] = [];
    if (f.status === "disputed") conds.push(sql`${disputes.id} is not null`);
    else if (f.status) conds.push(eq(bookings.status, f.status));
    if (f.from) conds.push(gte(bookings.startsAt, f.from));
    if (f.to) conds.push(lt(bookings.startsAt, f.to));
    if (f.studentId) conds.push(eq(bookings.studentId, f.studentId));
    const q = f.search?.trim();
    if (q) {
      const p = like(q);
      conds.push(
        or(
          ilike(sql`${student.firstName} || ' ' || ${student.lastName}`, p),
          ilike(student.email, p),
          ilike(sql`${teacher.firstName} || ' ' || ${teacher.lastName}`, p),
          ilike(teacher.email, p),
          ilike(sql`${bookings.id}::text`, `${q.toLowerCase().replace(/[\\%_]/g, "")}%`),
        ),
      );
    }
    const where = and(...conds);

    const [[{ total }], rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(bookings)
        .innerJoin(student, eq(student.id, bookings.studentId))
        .innerJoin(teacher, eq(teacher.id, bookings.teacherId))
        .leftJoin(disputes, eq(disputes.bookingId, bookings.id))
        .where(where),
      this.db
        .select({
          b: bookings,
          student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email },
          teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email },
          dispute: { id: disputes.id, status: disputes.status },
          pack: { lessonCount: lessonPackages.lessonCount, lessonsUsed: lessonPackages.lessonsUsed },
          endedAt: lessons.endedAt,
          paymentStatus: sql<PaymentStatus | null>`(select p.status from payments p where p.booking_id = ${bookings.id} or (${bookings.packageId} is not null and p.package_id = ${bookings.packageId}) order by p.created_at desc limit 1)`,
        })
        .from(bookings)
        .innerJoin(student, eq(student.id, bookings.studentId))
        .innerJoin(teacher, eq(teacher.id, bookings.teacherId))
        .leftJoin(disputes, eq(disputes.bookingId, bookings.id))
        .leftJoin(lessonPackages, eq(lessonPackages.id, bookings.packageId))
        .leftJoin(lessons, eq(lessons.bookingId, bookings.id))
        .where(where)
        .orderBy(f.sort === "createdAt" ? desc(bookings.createdAt) : desc(bookings.startsAt), desc(bookings.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const items = rows.map(({ b, student: s, teacher: t, dispute, pack, endedAt, paymentStatus }) => {
      const openDispute = dispute?.status === "open";
      const end = lessonEnd(b, endedAt);
      return {
        id: b.id,
        startsAt: b.startsAt,
        durationMin: b.durationMin,
        createdAt: b.createdAt,
        type: b.type,
        topic: b.topic,
        amountCents: b.priceCents,
        status: b.status,
        paymentStatus,
        package: b.packageId && pack?.lessonCount ? { id: b.packageId, lessonCount: pack.lessonCount, lessonsUsed: pack.lessonsUsed } : null,
        student: { id: s.id, name: name(s), email: s.email },
        teacher: { id: t.id, name: name(t), email: t.email },
        dispute: dispute?.id ? { id: dispute.id, status: dispute.status } : null,
        cancelledBy: b.cancelledBy,
        cancelReason: b.cancelReason,
        lessonEndedAt: b.status === "completed" || b.status === "no_show" ? end : null,
        /** Admin cancel: only before the lesson starts (full refund or package credit). */
        canCancel: (b.status === "confirmed" || b.status === "pending_payment") && b.startsAt > now,
        /** Admin refund of a taught lesson: 24 h after it, or later while a dispute is open. */
        canRefund: (b.status === "completed" && (openDispute || (!!endedAt && canAdminRefundAfterLesson(endedAt, now)))) || (b.status === "no_show" && openDispute),
      };
    });
    return { items, total, page, pageSize };
  }

  /* ---------------------------------------------------------------- students */
  async students(p: { search?: string; status?: UserStatus; page?: number } = {}) {
    const page = pageOf(p.page);
    const conds: (SQL | undefined)[] = [eq(users.role, "student")];
    if (p.status) conds.push(eq(users.status, p.status));
    else conds.push(ne(users.status, "deleted"));
    const q = p.search?.trim();
    if (q) conds.push(or(ilike(sql`${users.firstName} || ' ' || ${users.lastName}`, like(q)), ilike(users.email, like(q)), ilike(users.country, like(q))));
    const where = and(...conds);

    const [[{ total }], rows, counts] = await Promise.all([
      this.db.select({ total: count() }).from(users).where(where),
      this.db
        .select(this.studentColumns())
        .from(users)
        .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
        .where(where)
        .orderBy(desc(users.createdAt), asc(users.id))
        .limit(STUDENTS_PAGE_SIZE)
        .offset((page - 1) * STUDENTS_PAGE_SIZE),
      this.db.select({ status: users.status, n: count() }).from(users).where(eq(users.role, "student")).groupBy(users.status),
    ]);
    const by = (s: UserStatus) => counts.find((c) => c.status === s)?.n ?? 0;
    return {
      items: rows,
      total,
      page,
      pageSize: STUDENTS_PAGE_SIZE,
      counts: { all: by("active") + by("blocked") + by("pending_verification"), active: by("active"), blocked: by("blocked"), pending_verification: by("pending_verification") },
    };
  }

  private studentColumns() {
    const now = this.clock.now();
    return {
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      country: users.country,
      timezone: users.timezone,
      birthDate: users.birthDate,
      status: users.status,
      joinedAt: users.createdAt,
      level: sql<string | null>`coalesce(${studentProfiles.cefrLevel}::text, ${studentProfiles.selfLevel}::text)`,
      cefrLevel: studentProfiles.cefrLevel,
      selfLevel: studentProfiles.selfLevel,
      goal: studentProfiles.goal,
      lessonsCompleted: sql<number>`(select count(*) from bookings b where b.student_id = ${users.id} and b.status = 'completed')::int`,
      upcomingLessons: sql<number>`(select count(*) from bookings b where b.student_id = ${users.id} and b.status = 'confirmed' and b.starts_at > ${now.toISOString()}::timestamptz)::int`,
      lastLessonAt: sql<string | null>`(select max(b.starts_at) from bookings b where b.student_id = ${users.id} and b.status = 'completed')`,
      totalPaidCents: sql<number>`(select coalesce(sum(p.amount_cents - p.refunded_cents), 0) from payments p where p.student_id = ${users.id} and p.status in ('succeeded', 'partially_refunded', 'refunded'))::int`,
    };
  }

  /** One student with their recent bookings, payments and disputes (detail drawer). */
  async student(id: string) {
    const [s] = await this.db
      .select(this.studentColumns())
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(and(eq(users.id, id), eq(users.role, "student")));
    if (!s) throw notFound("Student");
    const [recent, pay, disp] = await Promise.all([
      this.bookings({ studentId: id, pageSize: 10 }),
      this.db
        .select({
          id: payments.id,
          amountCents: payments.amountCents,
          refundedCents: payments.refundedCents,
          status: payments.status,
          createdAt: payments.createdAt,
          bookingId: payments.bookingId,
          packageId: payments.packageId,
        })
        .from(payments)
        .where(eq(payments.studentId, id))
        .orderBy(desc(payments.createdAt))
        .limit(10),
      this.db
        .select({ id: disputes.id, status: disputes.status, bookingId: disputes.bookingId, createdAt: disputes.createdAt })
        .from(disputes)
        .where(eq(disputes.studentId, id))
        .orderBy(desc(disputes.createdAt)),
    ]);
    return { ...s, bookings: recent.items, bookingsTotal: recent.total, payments: pay, disputes: disp };
  }

  /* ---------------------------------------------------------------- payments */
  async payments(p: { page?: number; payoutsPage?: number; status?: PaymentStatus; search?: string } = {}) {
    const page = pageOf(p.page);
    const payoutsPage = pageOf(p.payoutsPage);
    const now = this.clock.now();
    const teacherUser = alias(users, "teacher");

    const conds: (SQL | undefined)[] = [];
    if (p.status) conds.push(eq(payments.status, p.status));
    const q = p.search?.trim();
    if (q) conds.push(or(ilike(sql`${users.firstName} || ' ' || ${users.lastName}`, like(q)), ilike(users.email, like(q))));
    const where = and(...conds);

    const [[{ total }], rows, [{ payoutsTotal }], payoutRows, [money], [comm], [paid], [owed], [failed]] = await Promise.all([
      this.db.select({ total: count() }).from(payments).innerJoin(users, eq(users.id, payments.studentId)).where(where),
      this.db
        .select({
          id: payments.id,
          amountCents: payments.amountCents,
          refundedCents: payments.refundedCents,
          status: payments.status,
          provider: payments.provider,
          createdAt: payments.createdAt,
          bookingId: payments.bookingId,
          packageId: payments.packageId,
          bookingType: bookings.type,
          lessonCount: lessonPackages.lessonCount,
          student: { id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email },
        })
        .from(payments)
        .innerJoin(users, eq(users.id, payments.studentId))
        .leftJoin(bookings, eq(bookings.id, payments.bookingId))
        .leftJoin(lessonPackages, eq(lessonPackages.id, payments.packageId))
        .where(where)
        .orderBy(desc(payments.createdAt), desc(payments.id))
        .limit(PAYMENTS_PAGE_SIZE)
        .offset((page - 1) * PAYMENTS_PAGE_SIZE),
      this.db.select({ payoutsTotal: count() }).from(payouts),
      this.db
        .select({
          id: payouts.id,
          amountCents: payouts.amountCents,
          status: payouts.status,
          method: payouts.method,
          onDemand: payouts.onDemand,
          requestedAt: payouts.requestedAt,
          paidAt: payouts.paidAt,
          teacher: { id: teacherUser.id, firstName: teacherUser.firstName, lastName: teacherUser.lastName, email: teacherUser.email },
        })
        .from(payouts)
        .innerJoin(teacherUser, eq(teacherUser.id, payouts.teacherId))
        .orderBy(desc(payouts.requestedAt), desc(payouts.id))
        .limit(PAYOUTS_PAGE_SIZE)
        .offset((payoutsPage - 1) * PAYOUTS_PAGE_SIZE),
      this.db
        .select({
          gross: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
          refunded: sql<number>`coalesce(sum(${payments.refundedCents}), 0)::int`,
        })
        .from(payments)
        .where(inArray(payments.status, COLLECTED)),
      this.db
        .select({ cents: sql<number>`coalesce(sum(${earnings.commissionCents}), 0)::int` })
        .from(earnings)
        .where(ne(earnings.status, "reversed")),
      this.db
        .select({ cents: sql<number>`coalesce(sum(${payouts.amountCents}), 0)::int` })
        .from(payouts)
        .where(eq(payouts.status, "paid")),
      this.db
        .select({
          available: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} = 'available'), 0)::int`,
          pending: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} = 'pending'), 0)::int`,
        })
        .from(earnings)
        .where(inArray(earnings.status, ["available", "pending"])),
      this.db.select({ n: count() }).from(payouts).where(eq(payouts.status, "failed")),
    ]);

    return {
      payments: {
        items: rows.map(({ student: s, ...r }) => ({ ...r, student: { id: s.id, name: name(s), email: s.email } })),
        total,
        page,
        pageSize: PAYMENTS_PAGE_SIZE,
      },
      payouts: {
        items: payoutRows.map(({ teacher: t, ...r }) => ({ ...r, teacher: { id: t.id, name: name(t), email: t.email } })),
        total: payoutsTotal,
        page: payoutsPage,
        pageSize: PAYOUTS_PAGE_SIZE,
      },
      totals: {
        grossCents: money.gross,
        refundedCents: money.refunded,
        netCents: money.gross - money.refunded,
        commissionCents: comm.cents,
        paidOutCents: paid.cents,
        outstandingCents: owed.available + owed.pending,
        availableCents: owed.available,
        pendingCents: owed.pending,
        failedPayouts: failed.n,
        nextPayoutDate: nextMonthlyPayoutDate(now),
      },
    };
  }

  /* ---------------------------------------------------------------- audit log */
  async auditLogs(p: { page?: number; entity?: string; search?: string } = {}) {
    const page = pageOf(p.page);
    const conds: (SQL | undefined)[] = [];
    if (p.entity) conds.push(eq(auditLogs.entity, p.entity));
    const q = p.search?.trim();
    if (q) conds.push(or(ilike(auditLogs.action, like(q)), ilike(auditLogs.entityId, like(q)), ilike(sql`${users.firstName} || ' ' || ${users.lastName}`, like(q))));
    const where = and(...conds);
    const [[{ total }], rows] = await Promise.all([
      this.db.select({ total: count() }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where),
      this.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          data: auditLogs.data,
          createdAt: auditLogs.createdAt,
          actor: { id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role },
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(AUDIT_PAGE_SIZE)
        .offset((page - 1) * AUDIT_PAGE_SIZE),
    ]);
    return {
      items: rows.map(({ actor, ...r }) => ({ ...r, actor: actor?.id ? { id: actor.id, name: name(actor), role: actor.role } : null })),
      total,
      page,
      pageSize: AUDIT_PAGE_SIZE,
    };
  }

  /* ---------------------------------------------------------------- settings */
  /** Platform rules as enforced by the domain code (read-only). */
  settings() {
    return {
      commissionRate: COMMISSION_RATE,
      priceRangeCents: { min: MIN_PRICE_CENTS, max: MAX_PRICE_CENTS },
      lessonMinutes: LESSON_MINUTES,
      packDiscounts: [
        { lessons: 5, discountPct: 5 },
        { lessons: 10, discountPct: 10 },
      ],
      trialMinutes: TRIAL_MINUTES,
      freeCancellationHours: FREE_CANCELLATION_HOURS,
      refundWindowHours: ADMIN_REFUND_WINDOW_HOURS,
      disputeWindowHours: ADMIN_REFUND_WINDOW_HOURS,
      minStudentAge: MIN_STUDENT_AGE,
      payoutDay: MONTHLY_PAYOUT_DAY,
      minWithdrawalCents: MIN_WITHDRAWAL_CENTS,
      paymentHoldMinutes: PAYMENT_HOLD_MIN,
      teacherWarning: { cancellations: TEACHER_WARNING_THRESHOLD, windowDays: TEACHER_WARNING_WINDOW_DAYS },
      nextPayoutDate: nextMonthlyPayoutDate(this.clock.now()),
    };
  }

  /** Small figures for the sidebar badges (cheap, polled every minute). */
  async badges() {
    const [[apps], [disp], [support], [flags], [docs]] = await Promise.all([
      this.db.select({ n: count() }).from(teacherProfiles).where(eq(teacherProfiles.status, "pending")),
      this.db.select({ n: count() }).from(disputes).where(eq(disputes.status, "open")),
      this.db.select({ n: count() }).from(supportMessages).where(eq(supportMessages.status, "open")),
      this.db.select({ n: count() }).from(moderationFlags).where(eq(moderationFlags.status, "open")),
      this.db.select({ n: count() }).from(teachingMaterials).where(eq(teachingMaterials.status, "pending")),
    ]);
    return { pendingApplications: apps.n, openDisputes: disp.n, openSupport: support.n, openModeration: flags.n, pendingMaterials: docs.n };
  }
}
