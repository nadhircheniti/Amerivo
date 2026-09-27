/** Demo-mode data (no API configured) in the same shapes as the admin API. Placeholders, not real figures. */
import type { AdminBooking, AdminDispute, AuditEntry, PaymentsData, PlatformSettings, StudentDetail, StudentList } from "./types";

const person = (id: string, name: string, email: string) => ({ id, name, email });
const maria = person("s-1", "Maria Silva", "maria@example.com");
const kenji = person("s-2", "Kenji Tanaka", "kenji@example.com");
const ana = person("s-3", "Ana Costa", "ana@example.com");
const sarah = person("t-1", "Sarah Mitchell", "sarah@amerivo.test");
const michael = person("t-2", "Michael Brooks", "michael@amerivo.test");

const booking = (p: Partial<AdminBooking> & Pick<AdminBooking, "id" | "startsAt" | "status" | "student" | "teacher">): AdminBooking => ({
  durationMin: 50,
  createdAt: "2026-10-01T10:00:00Z",
  type: "single",
  topic: null,
  amountCents: 3500,
  paymentStatus: "succeeded",
  package: null,
  dispute: null,
  cancelledBy: null,
  cancelReason: null,
  lessonEndedAt: null,
  canCancel: false,
  canRefund: false,
  ...p,
});

export const sampleBookings: AdminBooking[] = [
  booking({ id: "b0000001-demo", startsAt: "2026-10-14T16:00:00Z", status: "confirmed", student: maria, teacher: sarah, canCancel: true }),
  booking({
    id: "b0000002-demo",
    startsAt: "2026-10-14T19:00:00Z",
    status: "confirmed",
    student: kenji,
    teacher: sarah,
    type: "trial",
    durationMin: 20,
    amountCents: 0,
    paymentStatus: null,
    canCancel: true,
  }),
  booking({
    id: "b0000003-demo",
    startsAt: "2026-10-13T09:00:00Z",
    status: "completed",
    student: ana,
    teacher: sarah,
    type: "package",
    amountCents: 3150,
    package: { id: "p-1", lessonCount: 10, lessonsUsed: 2 },
    lessonEndedAt: "2026-10-13T09:50:00Z",
    dispute: { id: "d-1", status: "open" },
    canRefund: true,
  }),
  booking({
    id: "b0000004-demo",
    startsAt: "2026-10-12T18:00:00Z",
    status: "completed",
    student: maria,
    teacher: michael,
    amountCents: 4500,
    lessonEndedAt: "2026-10-12T18:50:00Z",
  }),
  booking({
    id: "b0000005-demo",
    startsAt: "2026-10-11T20:00:00Z",
    status: "refunded",
    student: kenji,
    teacher: michael,
    paymentStatus: "refunded",
    cancelledBy: "teacher",
    cancelReason: "Cancelled by teacher — full refund",
  }),
];

export const sampleStudents: StudentList = {
  items: [
    {
      id: "s-1",
      firstName: "Maria",
      lastName: "Silva",
      email: "maria@example.com",
      phone: null,
      country: "Brazil",
      timezone: "America/Sao_Paulo",
      birthDate: null,
      status: "active",
      joinedAt: "2026-03-02T10:00:00Z",
      level: "B1",
      cefrLevel: "B1",
      selfLevel: "intermediate",
      goal: "business",
      lessonsCompleted: 14,
      upcomingLessons: 1,
      lastLessonAt: "2026-10-12T18:00:00Z",
      totalPaidCents: 52500,
    },
    {
      id: "s-2",
      firstName: "Kenji",
      lastName: "Tanaka",
      email: "kenji@example.com",
      phone: null,
      country: "Japan",
      timezone: "Asia/Tokyo",
      birthDate: null,
      status: "active",
      joinedAt: "2026-09-20T10:00:00Z",
      level: "beginner",
      cefrLevel: null,
      selfLevel: "beginner",
      goal: "travel",
      lessonsCompleted: 0,
      upcomingLessons: 1,
      lastLessonAt: null,
      totalPaidCents: 0,
    },
    {
      id: "s-3",
      firstName: "Ana",
      lastName: "Costa",
      email: "ana@example.com",
      phone: null,
      country: "Portugal",
      timezone: "Europe/Lisbon",
      birthDate: null,
      status: "blocked",
      joinedAt: "2026-05-11T10:00:00Z",
      level: "B2",
      cefrLevel: "B2",
      selfLevel: "advanced",
      goal: "university",
      lessonsCompleted: 6,
      upcomingLessons: 0,
      lastLessonAt: "2026-10-13T09:00:00Z",
      totalPaidCents: 31500,
    },
  ],
  total: 3,
  page: 1,
  pageSize: 25,
  counts: { all: 3, active: 2, blocked: 1, pending_verification: 0 },
};

export const sampleStudentDetail = (id: string): StudentDetail => {
  const s = sampleStudents.items.find((x) => x.id === id) ?? sampleStudents.items[0];
  const bookings = sampleBookings.filter((b) => b.student.id === s.id);
  return { ...s, bookings, bookingsTotal: bookings.length, payments: [], disputes: [] };
};

export const samplePayments: PaymentsData = {
  payments: {
    items: [
      {
        id: "pay-1",
        amountCents: 3500,
        refundedCents: 0,
        status: "succeeded",
        provider: "stripe",
        createdAt: "2026-10-10T12:00:00Z",
        bookingId: "b0000001-demo",
        packageId: null,
        bookingType: "single",
        lessonCount: null,
        student: maria,
      },
      {
        id: "pay-2",
        amountCents: 31500,
        refundedCents: 0,
        status: "succeeded",
        provider: "stripe",
        createdAt: "2026-10-05T09:00:00Z",
        bookingId: null,
        packageId: "p-1",
        bookingType: null,
        lessonCount: 10,
        student: ana,
      },
      {
        id: "pay-3",
        amountCents: 3500,
        refundedCents: 3500,
        status: "refunded",
        provider: "stripe",
        createdAt: "2026-10-04T15:00:00Z",
        bookingId: "b0000005-demo",
        packageId: null,
        bookingType: "single",
        lessonCount: null,
        student: kenji,
      },
    ],
    total: 3,
    page: 1,
    pageSize: 20,
  },
  payouts: {
    items: [
      { id: "po-1", amountCents: 84000, status: "paid", method: "stripe", onDemand: false, requestedAt: "2026-09-28T06:00:00Z", paidAt: "2026-09-28T06:01:00Z", teacher: sarah },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  },
  totals: {
    grossCents: 38500,
    refundedCents: 3500,
    netCents: 35000,
    commissionCents: 8750,
    paidOutCents: 84000,
    outstandingCents: 28000,
    availableCents: 22400,
    pendingCents: 5600,
    failedPayouts: 0,
    nextPayoutDate: "2026-10-28T00:00:00Z",
  },
};

export const sampleDisputes: AdminDispute[] = [
  {
    id: "d-1",
    bookingId: "b0000003-demo",
    status: "open",
    reason: "Teacher's connection dropped for 20 minutes.",
    resolution: null,
    createdAt: "2026-10-13T12:00:00Z",
    resolvedAt: null,
    resolvedBy: null,
    ageHours: 5,
    amountCents: 3150,
    lessonDate: "2026-10-13T09:00:00Z",
    lessonEndedAt: "2026-10-13T09:50:00Z",
    attendance: "attended",
    paymentStatus: "succeeded",
    booking: { id: "b0000003-demo", type: "package", status: "completed", startsAt: "2026-10-13T09:00:00Z", durationMin: 50, priceCents: 3150, topic: null, packageId: "p-1" },
    student: { id: "s-3", firstName: "Ana", lastName: "Costa", email: "ana@example.com" },
    teacher: { id: "t-1", firstName: "Sarah", lastName: "Mitchell", email: "sarah@amerivo.test" },
  },
];

export const sampleAudit = {
  items: [
    {
      id: "a-1",
      action: "teacher.approved",
      entity: "teacher",
      entityId: "t-1",
      data: null,
      createdAt: "2026-10-12T10:00:00Z",
      actor: { id: "adm", name: "Ada Admin", role: "admin" },
    },
    {
      id: "a-2",
      action: "booking.refund",
      entity: "booking",
      entityId: "b0000005-demo",
      data: { amountCents: 3500 },
      createdAt: "2026-10-11T21:00:00Z",
      actor: { id: "adm", name: "Ada Admin", role: "admin" },
    },
    { id: "a-3", action: "user.blocked", entity: "user", entityId: "s-3", data: null, createdAt: "2026-10-10T08:00:00Z", actor: { id: "adm", name: "Ada Admin", role: "admin" } },
  ] as AuditEntry[],
  total: 3,
  page: 1,
  pageSize: 30,
};

export const sampleSettings: PlatformSettings = {
  commissionRate: 0.25,
  priceRangeCents: { min: 2000, max: 5000 },
  lessonMinutes: 50,
  packDiscounts: [
    { lessons: 5, discountPct: 5 },
    { lessons: 10, discountPct: 10 },
  ],
  trialMinutes: 20,
  freeCancellationHours: 24,
  refundWindowHours: 24,
  disputeWindowHours: 24,
  minStudentAge: 13,
  payoutDay: 28,
  minWithdrawalCents: 2000,
  paymentHoldMinutes: 30,
  teacherWarning: { cancellations: 3, windowDays: 30 },
  nextPayoutDate: "2026-10-28T00:00:00Z",
};
