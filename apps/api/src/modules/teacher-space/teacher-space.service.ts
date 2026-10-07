import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, isNull, lt, notInArray, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { DB, type Db } from "../../db/db";
import { bookings, earnings, lessonPackages, lessonReports, lessons, notifications, payouts, studentProfiles, teacherProfiles, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { webOrigin } from "../../common/cors";
import { badRequest, forbidden, notFound } from "../../common/errors";
import { classroomWindow } from "../../domain/classroom";
import { MIN_WITHDRAWAL_CENTS, MONTHLY_PAYOUT_DAY, nextMonthlyPayoutDate } from "../../domain/earnings";
import { StripeService } from "../../integrations/stripe.service";
import { EarningsService } from "../earnings/earnings.service";

/** Bookings that count as "taught or to teach" (paid and not cancelled). */
const TAUGHT = ["confirmed", "completed", "no_show"] as const;
const DONE = ["completed", "no_show"] as const;

/** Raw SQL aggregates come back as strings (node-postgres) or Dates (PGlite). */
const toDate = (v: unknown) => (v == null ? null : new Date(v as string));
const hours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

const studentColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  country: users.country,
  avatarUrl: users.avatarUrl,
  level: studentProfiles.cefrLevel,
  goal: studentProfiles.goal,
};

@Injectable()
export class TeacherSpaceService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly stripe: StripeService,
    private readonly earningsService: EarningsService,
  ) {}

  private async profile(teacherId: string) {
    const [p] = await this.db
      .select({
        timezone: teacherProfiles.timezone,
        slug: teacherProfiles.slug,
        ratingAvgX100: teacherProfiles.ratingAvg,
        ratingCount: teacherProfiles.ratingCount,
        lessonsCompleted: teacherProfiles.lessonsCompleted,
        vacationMode: teacherProfiles.vacationMode,
        stripeAccountId: teacherProfiles.stripeAccountId,
        email: users.email,
        firstName: users.firstName,
        avatarUrl: users.avatarUrl,
      })
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(eq(teacherProfiles.userId, teacherId));
    if (!p) throw notFound("Teacher profile");
    return p;
  }

  /** Completed lessons, hours and last lesson per student with this teacher. */
  private async historyByStudent(teacherId: string, studentIds: string[]) {
    const map = new Map<string, { lessons: number; hours: number; lastLessonAt: Date | null; lastNote: string | null }>();
    if (!studentIds.length) return map;
    const rows = await this.db
      .select({
        studentId: bookings.studentId,
        lessons: sql<number>`count(*)::int`,
        minutes: sql<number>`coalesce(sum(${bookings.durationMin}),0)::int`,
        last: sql<unknown>`max(${bookings.startsAt})`,
      })
      .from(bookings)
      .where(and(eq(bookings.teacherId, teacherId), inArray(bookings.studentId, studentIds), eq(bookings.status, "completed")))
      .groupBy(bookings.studentId);
    const notes = await this.db
      .select({ studentId: bookings.studentId, recommendation: lessonReports.recommendation, topics: lessonReports.topicsCovered })
      .from(lessonReports)
      .innerJoin(lessons, eq(lessons.id, lessonReports.lessonId))
      .innerJoin(bookings, eq(bookings.id, lessons.bookingId))
      .where(and(eq(bookings.teacherId, teacherId), inArray(bookings.studentId, studentIds)))
      .orderBy(desc(bookings.startsAt));
    for (const id of studentIds) {
      const r = rows.find((x) => x.studentId === id);
      const n = notes.find((x) => x.studentId === id);
      map.set(id, { lessons: r?.lessons ?? 0, hours: hours(r?.minutes ?? 0), lastLessonAt: toDate(r?.last), lastNote: n ? n.recommendation || n.topics : null });
    }
    return map;
  }

  /* ---------------------------------------------------------------- overview */
  /** Everything the teacher dashboard shows, "today" being in the teacher's own time zone. */
  async overview(teacherId: string) {
    const p = await this.profile(teacherId);
    const now = this.clock.now();
    const local = DateTime.fromJSDate(now, { zone: p.timezone });
    const dayStart = local.startOf("day").toJSDate();
    const dayEnd = local.startOf("day").plus({ days: 1 }).toJSDate();
    const monthStart = local.startOf("month").toJSDate();
    const monthEnd = local.startOf("month").plus({ months: 1 }).toJSDate();
    const nowIso = now.toISOString();

    const today = await this.db
      .select({ booking: bookings, student: studentColumns })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, bookings.studentId))
      .where(and(eq(bookings.teacherId, teacherId), inArray(bookings.status, [...TAUGHT]), gte(bookings.startsAt, dayStart), lt(bookings.startsAt, dayEnd)))
      .orderBy(asc(bookings.startsAt));
    const history = await this.historyByStudent(teacherId, [...new Set(today.map((r) => r.student.id))]);

    const [counts] = await this.db
      .select({
        upcoming: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed' and ${bookings.startsAt} >= ${nowIso}::timestamptz)::int`,
        nextAt: sql<unknown>`min(${bookings.startsAt}) filter (where ${bookings.status} = 'confirmed' and ${bookings.startsAt} >= ${nowIso}::timestamptz)`,
        active: sql<number>`count(distinct ${bookings.studentId}) filter (where ${bookings.status} in ('confirmed','completed','no_show') and ${bookings.startsAt} >= ${new Date(now.getTime() - 30 * 86_400_000).toISOString()}::timestamptz)::int`,
        total: sql<number>`count(distinct ${bookings.studentId}) filter (where ${bookings.status} in ('confirmed','completed','no_show'))::int`,
        monthLessons: sql<number>`count(*) filter (where ${bookings.startsAt} >= ${monthStart.toISOString()}::timestamptz and ${bookings.startsAt} < ${monthEnd.toISOString()}::timestamptz and ${bookings.status} <> 'pending_payment')::int`,
        monthCancelled: sql<number>`count(*) filter (where ${bookings.cancelledAt} >= ${monthStart.toISOString()}::timestamptz and ${bookings.cancelledAt} < ${monthEnd.toISOString()}::timestamptz)::int`,
        monthCancelledByTeacher: sql<number>`count(*) filter (where ${bookings.cancelledBy} = 'teacher' and ${bookings.cancelledAt} >= ${monthStart.toISOString()}::timestamptz and ${bookings.cancelledAt} < ${monthEnd.toISOString()}::timestamptz)::int`,
      })
      .from(bookings)
      .where(eq(bookings.teacherId, teacherId));

    // Students whose first paid booking with this teacher was made in the last 7 days.
    const firsts = await this.db
      .select({ studentId: bookings.studentId, first: sql<unknown>`min(${bookings.createdAt})` })
      .from(bookings)
      .where(and(eq(bookings.teacherId, teacherId), inArray(bookings.status, [...TAUGHT])))
      .groupBy(bookings.studentId);
    const weekAgo = now.getTime() - 7 * 86_400_000;
    const newThisWeek = firsts.filter((f) => (toDate(f.first)?.getTime() ?? 0) >= weekAgo).length;

    await this.earningsService.release(now);
    const [money] = await this.db
      .select({
        // "This month" = lessons given this month (teacher's time zone).
        monthPending: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} in ('pending','available') and ${bookings.startsAt} >= ${monthStart.toISOString()}::timestamptz),0)::int`,
        monthNet: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} <> 'reversed' and ${bookings.startsAt} >= ${monthStart.toISOString()}::timestamptz),0)::int`,
        unpaid: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} in ('pending','available')),0)::int`,
      })
      .from(earnings)
      .innerJoin(bookings, eq(bookings.id, earnings.bookingId))
      .where(eq(earnings.teacherId, teacherId));

    const reportRows = await this.db
      .select({ bookingId: bookings.id, startsAt: bookings.startsAt, status: bookings.status, student: { id: users.id, firstName: users.firstName, lastName: users.lastName } })
      .from(bookings)
      .innerJoin(lessons, eq(lessons.bookingId, bookings.id))
      .leftJoin(lessonReports, eq(lessonReports.lessonId, lessons.id))
      .innerJoin(users, eq(users.id, bookings.studentId))
      .where(and(eq(bookings.teacherId, teacherId), inArray(bookings.status, [...DONE]), isNull(lessonReports.id)))
      .orderBy(desc(bookings.startsAt))
      .limit(20);

    const recentStudents = await this.db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, avatarUrl: users.avatarUrl, last: sql<unknown>`max(${bookings.startsAt})` })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.studentId))
      .where(and(eq(bookings.teacherId, teacherId), inArray(bookings.status, [...TAUGHT])))
      .groupBy(users.id, users.firstName, users.lastName, users.avatarUrl)
      .orderBy(desc(sql`max(${bookings.startsAt})`))
      .limit(3);

    const recentNotifications = await this.db
      .select({ id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body, readAt: notifications.readAt, createdAt: notifications.createdAt })
      .from(notifications)
      .where(eq(notifications.userId, teacherId))
      .orderBy(desc(notifications.createdAt))
      .limit(5);

    return {
      firstName: p.firstName,
      avatarUrl: p.avatarUrl,
      slug: p.slug,
      timezone: p.timezone,
      vacationMode: p.vacationMode,
      now,
      today: today.map(({ booking: b, student }) => {
        const h = history.get(student.id);
        return {
          bookingId: b.id,
          startsAt: b.startsAt,
          durationMin: b.durationMin,
          // When "Start lesson" can be used (same rule as POST /bookings/:id/join).
          ...classroomWindow(b),
          type: b.type,
          status: b.status,
          topic: b.topic,
          student,
          history: h ?? { lessons: 0, hours: 0, lastLessonAt: null, lastNote: null },
        };
      }),
      upcomingCount: counts.upcoming,
      nextLessonAt: toDate(counts.nextAt),
      earnings: { monthPendingCents: money.monthPending, monthNetCents: money.monthNet, unpaidCents: money.unpaid, nextPayoutDate: nextMonthlyPayoutDate(now) },
      students: { active: counts.active, total: counts.total, newThisWeek, recent: recentStudents.map(({ last: _l, ...s }) => s) },
      rating: { avgX100: p.ratingAvgX100, count: p.ratingCount },
      lessonsCompleted: p.lessonsCompleted,
      cancellations: { thisMonth: counts.monthCancelled, byTeacher: counts.monthCancelledByTeacher, lessonsThisMonth: counts.monthLessons },
      reportsToWrite: reportRows,
      notifications: recentNotifications,
    };
  }

  /* ---------------------------------------------------------------- students */
  /** Everyone who booked (and paid) a lesson with this teacher. */
  async students(teacherId: string) {
    const nowIso = this.clock.now().toISOString();
    const rows = await this.db
      .select({
        ...studentColumns,
        lessonsCompleted: sql<number>`count(*) filter (where ${bookings.status} = 'completed')::int`,
        minutes: sql<number>`coalesce(sum(${bookings.durationMin}) filter (where ${bookings.status} = 'completed'),0)::int`,
        upcoming: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed' and ${bookings.startsAt} >= ${nowIso}::timestamptz)::int`,
        nextLessonAt: sql<unknown>`min(${bookings.startsAt}) filter (where ${bookings.status} = 'confirmed' and ${bookings.startsAt} >= ${nowIso}::timestamptz)`,
        lastLessonAt: sql<unknown>`max(${bookings.startsAt}) filter (where ${bookings.status} in ('completed','no_show'))`,
        firstBookedAt: sql<unknown>`min(${bookings.createdAt})`,
        hadTrial: sql<boolean>`bool_or(${bookings.type} = 'trial')`,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, bookings.studentId))
      .where(and(eq(bookings.teacherId, teacherId), inArray(bookings.status, [...TAUGHT])))
      .groupBy(users.id, users.firstName, users.lastName, users.country, users.avatarUrl, studentProfiles.cefrLevel, studentProfiles.goal);
    const packs = await this.packagesLeft(teacherId);
    return rows
      .map(({ minutes, ...r }) => ({
        ...r,
        hours: hours(minutes),
        nextLessonAt: toDate(r.nextLessonAt),
        lastLessonAt: toDate(r.lastLessonAt),
        firstBookedAt: toDate(r.firstBookedAt),
        packageRemaining: packs.get(r.id) ?? 0,
      }))
      .sort((a, b) => {
        // Students with an upcoming lesson first (soonest first), then the most recent ones.
        if (a.nextLessonAt && b.nextLessonAt) return a.nextLessonAt.getTime() - b.nextLessonAt.getTime();
        if (a.nextLessonAt || b.nextLessonAt) return a.nextLessonAt ? -1 : 1;
        return (b.lastLessonAt?.getTime() ?? 0) - (a.lastLessonAt?.getTime() ?? 0);
      });
  }

  /** Lessons left in active packs, per student. */
  private async packagesLeft(teacherId: string, studentId?: string) {
    const rows = await this.db
      .select({ studentId: lessonPackages.studentId, left: sql<number>`coalesce(sum(${lessonPackages.lessonCount} - ${lessonPackages.lessonsUsed}),0)::int` })
      .from(lessonPackages)
      .where(and(eq(lessonPackages.teacherId, teacherId), eq(lessonPackages.status, "active"), studentId ? eq(lessonPackages.studentId, studentId) : undefined))
      .groupBy(lessonPackages.studentId);
    return new Map(rows.map((r) => [r.studentId, r.left]));
  }

  /** One student: profile, totals and the lesson history with this teacher (reports included). */
  async student(teacherId: string, studentId: string) {
    const list = await this.db
      .select({
        bookingId: bookings.id,
        startsAt: bookings.startsAt,
        durationMin: bookings.durationMin,
        type: bookings.type,
        status: bookings.status,
        topic: bookings.topic,
        attendance: lessons.attendance,
        report: {
          id: lessonReports.id,
          topicsCovered: lessonReports.topicsCovered,
          strengths: lessonReports.strengths,
          developmentAreas: lessonReports.developmentAreas,
          homework: lessonReports.homework,
          homeworkDue: lessonReports.homeworkDue,
          recommendation: lessonReports.recommendation,
          sentAt: lessonReports.sentAt,
        },
      })
      .from(bookings)
      .leftJoin(lessons, eq(lessons.bookingId, bookings.id))
      .leftJoin(lessonReports, eq(lessonReports.lessonId, lessons.id))
      .where(and(eq(bookings.teacherId, teacherId), eq(bookings.studentId, studentId), notInArray(bookings.status, ["pending_payment"])))
      .orderBy(desc(bookings.startsAt))
      .limit(200);
    if (!list.some((l) => (TAUGHT as readonly string[]).includes(l.status))) throw notFound("Student");
    const [student] = await this.db
      .select({ ...studentColumns, nativeLanguage: users.nativeLanguage, timezone: users.timezone, placementScores: studentProfiles.placementScores })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, studentId));
    const now = this.clock.now().getTime();
    const completed = list.filter((l) => l.status === "completed");
    const upcoming = list.filter((l) => l.status === "confirmed" && l.startsAt.getTime() >= now);
    return {
      student,
      lessonsCompleted: completed.length,
      hours: hours(completed.reduce((a, l) => a + l.durationMin, 0)),
      upcoming: upcoming.length,
      nextLessonAt: upcoming.length ? upcoming[upcoming.length - 1].startsAt : null,
      lastLessonAt: list.find((l) => (DONE as readonly string[]).includes(l.status))?.startsAt ?? null,
      packageRemaining: (await this.packagesLeft(teacherId, studentId)).get(studentId) ?? 0,
      lessons: list.map((l) => ({ ...l, report: l.report?.id ? l.report : null })),
    };
  }

  /* ------------------------------------------------------------ lesson report */
  /** What the report page needs for one booking (the teacher's own lessons only). */
  async lesson(teacherId: string, bookingId: string) {
    const [row] = await this.db
      .select({ booking: bookings, student: studentColumns, lesson: { attendance: lessons.attendance, endedAt: lessons.endedAt, id: lessons.id } })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, bookings.studentId))
      .leftJoin(lessons, eq(lessons.bookingId, bookings.id))
      .where(eq(bookings.id, bookingId));
    if (!row) throw notFound("Booking");
    const b = row.booking;
    if (b.teacherId !== teacherId) throw forbidden();
    const [report] = row.lesson?.id ? await this.db.select().from(lessonReports).where(eq(lessonReports.lessonId, row.lesson.id)) : [];
    const h = (await this.historyByStudent(teacherId, [b.studentId])).get(b.studentId)!;
    return {
      bookingId: b.id,
      status: b.status,
      type: b.type,
      topic: b.topic,
      startsAt: b.startsAt,
      durationMin: b.durationMin,
      attendance: row.lesson?.attendance ?? null,
      student: row.student,
      history: { lessons: h.lessons, hours: h.hours },
      // "End lesson" is possible once the lesson has started.
      canComplete: b.status === "confirmed" && this.clock.now() >= b.startsAt,
      report: report ?? null,
    };
  }

  /* ---------------------------------------------------------------- earnings */
  /** Balances, per-lesson ledger, payouts and the monthly chart. */
  async earningsDetails(teacherId: string) {
    const p = await this.profile(teacherId);
    const now = this.clock.now();
    await this.earningsService.release(now);

    const [totals] = await this.db
      .select({
        pending: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} = 'pending'),0)::int`,
        available: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} = 'available'),0)::int`,
        availableLessons: sql<number>`count(*) filter (where ${earnings.status} = 'available')::int`,
        paid: sql<number>`coalesce(sum(${earnings.netCents}) filter (where ${earnings.status} = 'paid'),0)::int`,
      })
      .from(earnings)
      .where(eq(earnings.teacherId, teacherId));

    const rows = await this.db
      .select({
        id: earnings.id,
        bookingId: bookings.id,
        date: bookings.startsAt,
        type: bookings.type,
        durationMin: bookings.durationMin,
        packageId: bookings.packageId,
        student: { id: users.id, firstName: users.firstName, lastName: users.lastName },
        grossCents: earnings.grossCents,
        commissionCents: earnings.commissionCents,
        netCents: earnings.netCents,
        status: earnings.status,
        availableAt: earnings.availableAt,
        payoutId: earnings.payoutId,
        createdAt: earnings.createdAt,
      })
      .from(earnings)
      .innerJoin(bookings, eq(bookings.id, earnings.bookingId))
      .innerJoin(users, eq(users.id, bookings.studentId))
      .where(eq(earnings.teacherId, teacherId))
      .orderBy(desc(bookings.startsAt))
      .limit(200);

    // "Pack of 10 · lesson 3": position of each lesson inside its package.
    const packageIds = [...new Set(rows.map((r) => r.packageId).filter((x): x is string => !!x))];
    const packInfo = new Map<string, { size: number; index: number }>();
    if (packageIds.length) {
      const packs = await this.db.select({ id: lessonPackages.id, size: lessonPackages.lessonCount }).from(lessonPackages).where(inArray(lessonPackages.id, packageIds));
      const inPacks = await this.db
        .select({ id: bookings.id, packageId: bookings.packageId })
        .from(bookings)
        .where(and(inArray(bookings.packageId, packageIds), inArray(bookings.status, [...TAUGHT])))
        .orderBy(asc(bookings.startsAt));
      for (const pk of packs) inPacks.filter((b) => b.packageId === pk.id).forEach((b, i) => packInfo.set(b.id, { size: pk.size, index: i + 1 }));
    }

    const payoutRows = await this.db.select().from(payouts).where(eq(payouts.teacherId, teacherId)).orderBy(desc(payouts.requestedAt)).limit(50);
    const perPayout = payoutRows.length
      ? await this.db
          .select({ payoutId: earnings.payoutId, lessons: sql<number>`count(*)::int` })
          .from(earnings)
          .where(inArray(earnings.payoutId, payoutRows.map((x) => x.id)))
          .groupBy(earnings.payoutId)
      : [];

    // Net per month of the lesson (teacher's time zone), last 6 months including the current one.
    const local = DateTime.fromJSDate(now, { zone: p.timezone }).startOf("month");
    const months = Array.from({ length: 6 }, (_, i) => local.minus({ months: 5 - i }));
    const recent = await this.db
      .select({ netCents: earnings.netCents, at: bookings.startsAt })
      .from(earnings)
      .innerJoin(bookings, eq(bookings.id, earnings.bookingId))
      .where(and(eq(earnings.teacherId, teacherId), gte(bookings.startsAt, months[0].toJSDate()), notInArray(earnings.status, ["reversed"])));
    const monthly = months.map((m) => {
      const from = m.toMillis();
      const to = m.plus({ months: 1 }).toMillis();
      return { month: m.toFormat("yyyy-LL"), netCents: recent.filter((r) => r.at.getTime() >= from && r.at.getTime() < to).reduce((a, r) => a + r.netCents, 0) };
    });

    const yearStart = DateTime.fromJSDate(now, { zone: p.timezone }).startOf("year").toJSDate();
    const paidThisYearCents = payoutRows.filter((x) => x.status === "paid" && (x.paidAt ?? x.requestedAt) >= yearStart).reduce((a, x) => a + x.amountCents, 0);

    return {
      balances: { pendingCents: totals.pending, availableCents: totals.available, availableLessons: totals.availableLessons, paidCents: totals.paid, paidThisYearCents },
      minWithdrawalCents: MIN_WITHDRAWAL_CENTS,
      nextPayoutDate: nextMonthlyPayoutDate(now),
      payoutDay: MONTHLY_PAYOUT_DAY,
      stripeConnected: !!p.stripeAccountId,
      timezone: p.timezone,
      monthly,
      rows: rows.map(({ packageId: _p, ...r }) => ({ ...r, package: packInfo.get(r.bookingId) ?? null })),
      payouts: payoutRows.map((x) => ({
        id: x.id,
        requestedAt: x.requestedAt,
        paidAt: x.paidAt,
        amountCents: x.amountCents,
        status: x.status,
        method: x.method,
        onDemand: x.onDemand,
        lessons: perPayout.find((c) => c.payoutId === x.id)?.lessons ?? 0,
      })),
    };
  }

  /* ---------------------------------------------------------- Stripe Connect */
  /** Starts (or resumes) Stripe Express onboarding; Stripe sends the teacher back to the earnings page. */
  async connect(teacherId: string) {
    const p = await this.profile(teacherId);
    const returnUrl = `${webOrigin()}/teacher/earnings?connect=done`;
    const link = await this.stripe.onboardingLink({ accountId: p.stripeAccountId, email: p.email, returnUrl });
    if (link.accountId !== p.stripeAccountId) await this.db.update(teacherProfiles).set({ stripeAccountId: link.accountId }).where(eq(teacherProfiles.userId, teacherId));
    return { url: link.url };
  }

  /** Connection state read from Stripe (no webhook needed: asked when the page loads). */
  async payoutStatus(teacherId: string) {
    const p = await this.profile(teacherId);
    if (!p.stripeAccountId) return { connected: false, detailsSubmitted: false, payoutsEnabled: false, requirementsDue: 0, destination: null };
    const acct = await this.stripe.retrieveAccount(p.stripeAccountId);
    const ext = (acct.external_accounts?.data?.[0] ?? null) as { bank_name?: string | null; brand?: string | null; last4?: string | null } | null;
    return {
      connected: true,
      detailsSubmitted: !!acct.details_submitted,
      payoutsEnabled: !!acct.payouts_enabled,
      requirementsDue: acct.requirements?.currently_due?.length ?? 0,
      destination: ext?.last4 ? { name: ext.bank_name ?? ext.brand ?? null, last4: ext.last4 } : null,
    };
  }

  /** Link to the Stripe Express dashboard (change bank account, see tax forms). */
  async dashboard(teacherId: string) {
    const p = await this.profile(teacherId);
    if (!p.stripeAccountId) throw badRequest("Connect your Stripe account first");
    return this.stripe.dashboardLink(p.stripeAccountId);
  }
}
