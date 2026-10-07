/**
 * Demo mode (no API): sample data in the same shape as the API so every student screen can be
 * reviewed. Dates are built relative to "now" so the sample always looks current.
 * Sample content (topics, homework, reports) stays in English like any teacher-written text.
 */
import { currentStudent } from "@/lib/mock-data";
import type { HomeworkRow, LessonDetail, Overview, PaymentRow, PaymentsPage, Profile, Progress, ReportSummary, StudentBooking, TeacherRef } from "./types";

const MIN = 60_000;
const DAY = 86_400_000;
const sarah: TeacherRef = { id: "t-sarah", firstName: "Sarah", lastName: "Mitchell", slug: "sarah-mitchell" };
const james: TeacherRef = { id: "t-james", firstName: "James", lastName: "Robinson", slug: "james-robinson" };

const iso = (ms: number) => new Date(ms).toISOString();
const day = (ms: number) => iso(ms).slice(0, 10);
/** Rounded to the next quarter hour so sample times look natural. */
const quarter = (ms: number) => Math.ceil(ms / (15 * MIN)) * 15 * MIN;

function booking(id: string, teacher: TeacherRef, startsAt: number, p: Partial<StudentBooking> = {}): StudentBooking {
  const durationMin = p.durationMin ?? 50;
  const now = Date.now();
  const status = p.status ?? "confirmed";
  const upcoming = (status === "confirmed" || status === "pending_payment") && startsAt > now;
  const priceCents = p.priceCents ?? 3500;
  const full = startsAt - now > 24 * 60 * MIN;
  return {
    id,
    type: "single",
    status,
    startsAt: iso(startsAt),
    endsAt: iso(startsAt + durationMin * MIN),
    durationMin,
    priceCents,
    topic: null,
    packageId: null,
    cancelledBy: null,
    cancelledAt: null,
    opensAt: iso(startsAt - 10 * MIN),
    closesAt: iso(startsAt + durationMin * MIN),
    teacher,
    hasReport: false,
    myReview: null,
    canReview: status === "completed",
    canCancel: upcoming,
    cancellation: upcoming
      ? {
          refundCents: full ? priceCents : 0,
          refundMode: full && priceCents > 0 ? (p.packageId ? "package_credit" : "money") : "none",
          fullRefund: full,
          freeUntil: iso(startsAt - 24 * 60 * MIN),
          reason: "",
        }
      : null,
    ...p,
  };
}

export function demoUpcoming(now = Date.now()): StudentBooking[] {
  return [
    booking("demo-next", sarah, quarter(now + 8 * MIN), { topic: "Leading a team meeting", type: "package", packageId: "demo-pack", priceCents: 3150 }),
    booking("demo-2", sarah, quarter(now + 2 * DAY), { topic: "Negotiation phrases", type: "package", packageId: "demo-pack", priceCents: 3150 }),
    booking("demo-3", james, quarter(now + 6 * DAY), { topic: "Small talk at work", priceCents: 2800 }),
  ];
}

export function demoPast(now = Date.now()): StudentBooking[] {
  return [
    booking("demo-past-1", sarah, quarter(now - 3 * DAY), { status: "completed", topic: "Presenting quarterly results", type: "package", packageId: "demo-pack", priceCents: 3150, hasReport: true, canReview: true }),
    booking("demo-past-2", james, quarter(now - 9 * DAY), { status: "completed", topic: "Job interview practice", priceCents: 2800, hasReport: true, myReview: { rating: 5 }, canReview: false }),
    booking("demo-past-3", james, quarter(now - 12 * DAY), { status: "cancelled", cancelledBy: "student", priceCents: 2800 }),
    booking("demo-past-4", sarah, quarter(now - 16 * DAY), { status: "completed", type: "trial", durationMin: 20, priceCents: 0, hasReport: true, myReview: { rating: 5 }, canReview: false }),
  ];
}

export function demoHomework(now = Date.now()): HomeworkRow[] {
  const base = { submissionUrl: null, createdAt: iso(now - 3 * DAY) };
  return [
    { ...base, id: "hw-1", description: "Write a meeting agenda (150 words)", dueDate: day(now + DAY), status: "assigned", bookingId: "demo-past-1", lessonDate: iso(now - 3 * DAY), teacher: sarah },
    { ...base, id: "hw-2", description: "Listening: podcast episode + 5 questions", dueDate: day(now + 5 * DAY), status: "assigned", bookingId: "demo-past-2", lessonDate: iso(now - 9 * DAY), teacher: james },
    { ...base, id: "hw-3", description: "Phrasal verbs worksheet", dueDate: day(now - 4 * DAY), status: "completed", bookingId: "demo-past-4", lessonDate: iso(now - 16 * DAY), teacher: sarah },
  ];
}

export function demoReports(now = Date.now()): ReportSummary[] {
  return [
    {
      bookingId: "demo-past-1",
      date: iso(quarter(now - 3 * DAY)),
      durationMin: 50,
      teacher: sarah,
      topicsCovered: "Presenting quarterly results",
      strengths: "Clear structure, good use of linking words.",
      developmentAreas: "Past tense endings; slow down on numbers.",
      recommendation: "Negotiation phrases; role-play a budget discussion.",
      sentAt: iso(now - 3 * DAY),
    },
    {
      bookingId: "demo-past-2",
      date: iso(quarter(now - 9 * DAY)),
      durationMin: 50,
      teacher: james,
      topicsCovered: "Job interview practice",
      strengths: "Confident answers, rich vocabulary.",
      developmentAreas: "Pronunciation of -ed endings.",
      recommendation: "Practise the STAR method with two new stories.",
      sentAt: iso(now - 9 * DAY),
    },
  ];
}

export function demoPayments(now = Date.now()): PaymentRow[] {
  const base = { refundedCents: 0, provider: "stripe" as const, status: "succeeded" as const };
  return [
    { ...base, id: "p-3", createdAt: iso(now - 4 * DAY), amountCents: 31500, bookingId: null, packageId: "demo-pack", teacher: sarah, what: { kind: "package", lessonCount: 10 } },
    { ...base, id: "p-2", createdAt: iso(now - 10 * DAY), amountCents: 2800, bookingId: "demo-past-2", packageId: null, teacher: james, what: { kind: "single", lessonDate: iso(now - 9 * DAY) } },
    { ...base, id: "p-1", createdAt: iso(now - 13 * DAY), amountCents: 2800, refundedCents: 2800, status: "refunded", bookingId: "demo-past-3", packageId: null, teacher: james, what: { kind: "single", lessonDate: iso(now - 12 * DAY) } },
  ];
}

export function demoOverview(now = Date.now()): Overview {
  const upcoming = demoUpcoming(now);
  const homework = demoHomework(now).filter((h) => h.status !== "completed");
  return {
    firstName: currentStudent.firstName,
    timezone: currentStudent.timezone,
    level: { current: "B1", target: "B2", selfLevel: "intermediate" },
    hoursStudied: 14.2,
    hoursThisMonth: 2.5,
    lessonsCompleted: 17,
    teachersCount: 2,
    activePackages: [{ id: "demo-pack", teacher: sarah, lessonCount: 10, lessonsUsed: 7, remaining: 3 }],
    nextLesson: upcoming[0],
    upcoming,
    homework,
    homeworkCounts: { open: homework.length, done: 8 },
    lastReport: demoReports(now)[0],
    lastTeacher: sarah,
    recentPayments: demoPayments(now),
  };
}

export function demoLesson(id: string, now = Date.now()): LessonDetail {
  const b = [...demoPast(now), ...demoUpcoming(now)].find((x) => x.id === id) ?? demoPast(now)[0];
  const r = demoReports(now).find((x) => x.bookingId === b.id) ?? demoReports(now)[0];
  const hw = demoHomework(now).filter((h) => h.bookingId === b.id);
  const endedAt = new Date(b.endsAt).getTime();
  return {
    ...b,
    lesson: b.status === "completed" ? { startedAt: b.startsAt, endedAt: b.endsAt, attendance: "attended" } : null,
    report: b.hasReport ? { topicsCovered: r.topicsCovered, strengths: r.strengths, developmentAreas: r.developmentAreas, homework: hw[0]?.description ?? null, homeworkDue: hw[0]?.dueDate ?? null, recommendation: r.recommendation, sentAt: r.sentAt } : null,
    review: b.myReview ? { rating: b.myReview.rating, comment: null, createdAt: b.endsAt } : null,
    homework: hw,
    dispute: null,
    disputeUntil: iso(endedAt + DAY),
    canDispute: b.status === "completed" && now < endedAt + DAY,
  };
}

export function demoProgress(now = Date.now()): Progress {
  const d = new Date(now);
  const lessons = [2, 3, 3, 2, 4, 3];
  return {
    level: { current: "B1", target: "B2", selfLevel: "intermediate" },
    levelHistory: [{ source: "placement_test", level: "B1", scores: { grammar: "B1", reading: "B2", listening: "B1", speaking: "A2" }, date: iso(now - 150 * DAY) }],
    lessonsPerMonth: lessons.map((n, i) => {
      const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (5 - i), 1));
      return { month: `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`, lessons: n, minutes: n * 50 };
    }),
    totalHours: 14.2,
    hoursThisMonth: 2.5,
    lessonsCompleted: 17,
    teachersCount: 2,
    reports: demoReports(now),
  };
}

export function demoPaymentsPage(now = Date.now()): PaymentsPage {
  return {
    payments: demoPayments(now),
    packages: [{ id: "demo-pack", lessonCount: 10, lessonsUsed: 7, remaining: 3, status: "active", totalCents: 31500, createdAt: iso(now - 4 * DAY), teacher: sarah }],
    totals: { spentCents: 34300, refundedCents: 2800 },
  };
}

export function demoProfile(): Profile {
  return {
    id: "demo-student",
    email: "maria.silva@example.com",
    firstName: "Maria",
    lastName: "Silva",
    phone: "+41 79 555 01 23",
    country: "Switzerland",
    nativeLanguage: "Portuguese",
    timezone: currentStudent.timezone,
    birthDate: null,
    avatarUrl: null,
  };
}
