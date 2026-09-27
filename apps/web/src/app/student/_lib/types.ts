/** Shapes returned by the student-space API (apps/api/src/modules/student-space). Dates are ISO strings. */

export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type BookingType = "trial" | "single" | "package";
export type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "refunded" | "no_show";
export type HomeworkStatus = "assigned" | "submitted" | "completed";

export type TeacherRef = { id?: string; firstName: string; lastName: string; slug: string; avatarUrl?: string | null };

export type CancellationPreview = {
  refundCents: number;
  refundMode: "none" | "money" | "package_credit";
  fullRefund: boolean;
  freeUntil: string;
  reason: string;
};

export type StudentBooking = {
  id: string;
  type: BookingType;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  priceCents: number;
  topic: string | null;
  packageId: string | null;
  cancelledBy: "student" | "teacher" | "admin" | null;
  cancelledAt: string | null;
  opensAt: string;
  closesAt: string;
  teacher: TeacherRef;
  hasReport: boolean;
  myReview: { rating: number } | null;
  canReview: boolean;
  canCancel: boolean;
  cancellation: CancellationPreview | null;
};

export type HomeworkRow = {
  id: string;
  description: string;
  dueDate: string | null;
  status: HomeworkStatus;
  submissionUrl: string | null;
  createdAt: string;
  bookingId: string | null;
  lessonDate: string | null;
  teacher: TeacherRef;
};

export type ReportSummary = {
  bookingId: string;
  date: string;
  durationMin: number;
  teacher: TeacherRef;
  topicsCovered: string;
  strengths: string | null;
  developmentAreas: string | null;
  recommendation: string | null;
  sentAt: string | null;
};

export type PaymentRow = {
  id: string;
  createdAt: string;
  amountCents: number;
  refundedCents: number;
  status: "requires_payment" | "succeeded" | "failed" | "refunded" | "partially_refunded";
  provider: "stripe" | "paypal";
  bookingId: string | null;
  packageId: string | null;
  teacher: { firstName: string; lastName: string; slug: string } | null;
  what: { kind: "package"; lessonCount: number } | { kind: BookingType; lessonDate: string | null };
};

export type PackageRow = {
  id: string;
  lessonCount: number;
  lessonsUsed: number;
  remaining: number;
  status: "pending_payment" | "active" | "exhausted" | "refunded" | "expired";
  totalCents: number;
  createdAt: string;
  teacher: TeacherRef;
};

export type Level = { current: Cefr | null; target: Cefr | null; selfLevel: "beginner" | "intermediate" | "advanced" | null };

export type Overview = {
  firstName: string;
  timezone: string;
  level: Level;
  hoursStudied: number;
  hoursThisMonth: number;
  lessonsCompleted: number;
  teachersCount: number;
  activePackages: { id: string; teacher: TeacherRef; lessonCount: number; lessonsUsed: number; remaining: number }[];
  nextLesson: StudentBooking | null;
  upcoming: StudentBooking[];
  homework: HomeworkRow[];
  homeworkCounts: { open: number; done: number };
  lastReport: ReportSummary | null;
  lastTeacher: TeacherRef | null;
  recentPayments: PaymentRow[];
};

export type Dispute = { id: string; bookingId: string; status: "open" | "refunded" | "rejected"; reason: string; resolution?: string | null; createdAt: string; resolvedAt?: string | null };

export type LessonDetail = StudentBooking & {
  lesson: { startedAt: string | null; endedAt: string | null; attendance: "attended" | "late" | "no_show" | null } | null;
  report: {
    topicsCovered: string;
    strengths: string | null;
    developmentAreas: string | null;
    homework: string | null;
    homeworkDue: string | null;
    recommendation: string | null;
    sentAt: string | null;
  } | null;
  review: { rating: number; comment: string | null; createdAt: string } | null;
  homework: HomeworkRow[];
  dispute: Dispute | null;
  disputeUntil: string;
  canDispute: boolean;
};

export type Progress = {
  level: Level;
  levelHistory: { source: "placement" | "placement_test"; level: Cefr; scores: Partial<Record<"grammar" | "reading" | "listening" | "speaking", Cefr>>; date: string }[];
  lessonsPerMonth: { month: string; lessons: number; minutes: number }[];
  totalHours: number;
  hoursThisMonth: number;
  lessonsCompleted: number;
  teachersCount: number;
  reports: ReportSummary[];
};

export type PaymentsPage = { payments: PaymentRow[]; packages: PackageRow[]; totals: { spentCents: number; refundedCents: number } };

export type Profile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
  nativeLanguage: string | null;
  timezone: string;
  birthDate: string | null;
  avatarUrl: string | null;
};
