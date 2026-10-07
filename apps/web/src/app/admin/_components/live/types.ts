/** Shapes returned by the admin API (apps/api/src/modules/admin-space, disputes). Dates are ISO strings. */

export type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "refunded" | "no_show";
export type PaymentStatus = "requires_payment" | "succeeded" | "failed" | "refunded" | "partially_refunded";
export type PayoutStatus = "requested" | "processing" | "paid" | "failed";
export type UserStatus = "pending_verification" | "active" | "blocked" | "deleted";
export type DisputeStatus = "open" | "refunded" | "rejected";
export type BookingKind = "trial" | "single" | "package";

export type Person = { id: string; name: string | null; email: string };
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export type AdminBooking = {
  id: string;
  startsAt: string;
  durationMin: number;
  createdAt: string;
  type: BookingKind;
  topic: string | null;
  amountCents: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus | null;
  package: { id: string; lessonCount: number; lessonsUsed: number } | null;
  student: Person;
  teacher: Person;
  dispute: { id: string; status: DisputeStatus } | null;
  cancelledBy: "student" | "teacher" | "admin" | null;
  cancelReason: string | null;
  lessonEndedAt: string | null;
  canCancel: boolean;
  canRefund: boolean;
};

export type Month = { month: string; revenueCents: number; lessons: number };

export type Overview = {
  periodDays: number;
  totalStudents: number;
  activeStudents: number;
  activeTeachers: number;
  pendingApplications: number;
  lessonsCompleted: number;
  lessonsCompletedAllTime: number;
  revenueCents: number;
  commissionCents: number;
  commissionRate: number;
  retentionRate: number | null;
  conversionRate: number | null;
  payoutsDue: { cents: number; availableCents: number; pendingCents: number; teachers: number; date: string };
  openDisputes: number;
  months: Month[];
  latestBookings: AdminBooking[];
};

export type AdminStudent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string | null;
  timezone: string;
  birthDate: string | null;
  status: UserStatus;
  joinedAt: string;
  level: string | null;
  cefrLevel: string | null;
  selfLevel: string | null;
  goal: string | null;
  lessonsCompleted: number;
  upcomingLessons: number;
  lastLessonAt: string | null;
  totalPaidCents: number;
};

export type StudentList = Page<AdminStudent> & { counts: { all: number; active: number; blocked: number; pending_verification: number } };

export type StudentDetail = AdminStudent & {
  bookings: AdminBooking[];
  bookingsTotal: number;
  payments: { id: string; amountCents: number; refundedCents: number; status: PaymentStatus; createdAt: string; bookingId: string | null; packageId: string | null }[];
  disputes: { id: string; status: DisputeStatus; bookingId: string; createdAt: string }[];
};

export type AdminPayment = {
  id: string;
  amountCents: number;
  refundedCents: number;
  status: PaymentStatus;
  provider: "stripe" | "paypal";
  createdAt: string;
  bookingId: string | null;
  packageId: string | null;
  bookingType: BookingKind | null;
  lessonCount: number | null;
  student: Person;
};

export type AdminPayout = {
  id: string;
  amountCents: number;
  status: PayoutStatus;
  method: "stripe" | "paypal";
  onDemand: boolean;
  requestedAt: string;
  paidAt: string | null;
  teacher: Person;
};

export type PaymentsData = {
  payments: Page<AdminPayment>;
  payouts: Page<AdminPayout>;
  totals: {
    grossCents: number;
    refundedCents: number;
    netCents: number;
    commissionCents: number;
    paidOutCents: number;
    outstandingCents: number;
    availableCents: number;
    pendingCents: number;
    failedPayouts: number;
    nextPayoutDate: string;
  };
};

export type AdminDispute = {
  id: string;
  bookingId: string;
  status: DisputeStatus;
  reason: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  ageHours: number;
  amountCents: number;
  lessonDate: string;
  lessonEndedAt: string;
  attendance: "attended" | "late" | "no_show" | null;
  paymentStatus: PaymentStatus | null;
  booking: { id: string; type: BookingKind; status: BookingStatus; startsAt: string; durationMin: number; priceCents: number; topic: string | null; packageId: string | null };
  student: { id: string; firstName: string; lastName: string; email: string };
  teacher: { id: string; firstName: string; lastName: string; email: string };
};

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  data: unknown;
  createdAt: string;
  actor: { id: string; name: string | null; role: "student" | "teacher" | "admin" } | null;
};

export type PlatformSettings = {
  commissionRate: number;
  priceRangeCents: { min: number; max: number };
  lessonMinutes: number;
  packDiscounts: { lessons: number; discountPct: number }[];
  trialMinutes: number;
  freeCancellationHours: number;
  refundWindowHours: number;
  disputeWindowHours: number;
  minStudentAge: number;
  payoutDay: number;
  minWithdrawalCents: number;
  paymentHoldMinutes: number;
  teacherWarning: { cancellations: number; windowDays: number };
  nextPayoutDate: string;
};

export type Badges = { pendingApplications: number; openDisputes: number; openSupport?: number; openModeration?: number; pendingMaterials?: number };

/* ---------- Trust & safety (contact details detected in user-to-user texts) ---------- */
export type ModerationStatus = "open" | "dismissed" | "warned" | "blocked";
export type ModerationContext = "message" | "lesson_chat" | "lesson_notes" | "lesson_report" | "review" | "profile" | "material" | "booking";
export type ModerationPerson = { id: string; firstName: string; lastName: string; role: "student" | "teacher" | "admin"; email?: string; status?: string };
export type ModerationFlag = {
  id: string;
  context: ModerationContext;
  types: string[];
  originalText: string;
  deliveredText: string | null;
  status: ModerationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  bookingId: string | null;
  conversationId: string | null;
  createdAt: string;
  sender: ModerationPerson;
  recipient: ModerationPerson | null;
  senderFlags30d: number;
};
export type ModerationList = { items: ModerationFlag[]; total: number; page: number; pageSize: number };
export type ModerationContextView = { kind: "conversation" | "lesson_chat" | "none"; messages: { id: string; senderId: string; body: string | null; createdAt: string }[] };

/* ---------- Support inbox (contact form) ---------- */
export type SupportStatus = "open" | "answered" | "closed";
export type SupportTopic = "general" | "student" | "teacher" | "billing" | "business" | "technical";
export type SupportMessage = {
  id: string;
  name: string;
  email: string;
  topic: SupportTopic;
  message: string;
  locale: string | null;
  status: SupportStatus;
  hasAccount: boolean;
  role: "student" | "teacher" | "admin" | null;
  lastReplyAt: string | null;
  createdAt: string;
};
export type SupportListItem = SupportMessage & { replies: number };
export type SupportList = { items: SupportListItem[]; total: number; page: number; pageSize: number };
export type SupportReply = { id: string; body: string; emailed: boolean; createdAt: string; author: string | null };
export type SupportDetail = SupportMessage & { replies: SupportReply[]; emailEnabled: boolean; supportEmail: string };
