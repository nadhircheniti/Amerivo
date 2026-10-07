/**
 * Amerivo English — database schema (PostgreSQL, Drizzle ORM).
 * Money is stored in integer cents (USD). Times are stored in UTC (timestamptz);
 * teacher availability rules are stored in the teacher's own IANA time zone.
 */
import { sql } from "drizzle-orm";
import {
  customType,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ enums */
export const userRole = pgEnum("user_role", ["student", "teacher", "admin"]);
export const userStatus = pgEnum("user_status", ["pending_verification", "active", "blocked", "deleted"]);
export const learningGoal = pgEnum("learning_goal", ["business", "travel", "university", "immigration", "conversation"]);
export const selfLevel = pgEnum("self_level", ["beginner", "intermediate", "advanced"]);
export const cefrLevel = pgEnum("cefr_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const placementStatus = pgEnum("placement_status", ["not_started", "skipped", "completed"]);
export const placementAttemptStatus = pgEnum("placement_attempt_status", ["in_progress", "completed", "abandoned"]);
export const genderPref = pgEnum("gender", ["female", "male", "other", "no_preference"]);
export const teacherStatus = pgEnum("teacher_status", ["draft", "pending", "approved", "rejected", "suspended"]);
export const identityStatus = pgEnum("identity_status", ["not_started", "pending", "verified", "failed"]);
export const bookingType = pgEnum("booking_type", ["trial", "single", "package"]);
export const bookingStatus = pgEnum("booking_status", ["pending_payment", "confirmed", "completed", "cancelled", "refunded", "no_show"]);
export const cancelledBy = pgEnum("cancelled_by", ["student", "teacher", "admin"]);
export const packageStatus = pgEnum("package_status", ["pending_payment", "active", "exhausted", "refunded", "expired"]);
export const paymentProvider = pgEnum("payment_provider", ["stripe", "paypal"]);
export const paymentStatus = pgEnum("payment_status", ["requires_payment", "succeeded", "failed", "refunded", "partially_refunded"]);
export const attendance = pgEnum("attendance", ["attended", "late", "no_show"]);
export const homeworkStatus = pgEnum("homework_status", ["assigned", "submitted", "completed"]);
export const earningStatus = pgEnum("earning_status", ["pending", "available", "paid", "reversed"]);
export const payoutStatus = pgEnum("payout_status", ["requested", "processing", "paid", "failed"]);
export const messageKind = pgEnum("message_kind", ["text", "file", "homework"]);
export const notificationChannel = pgEnum("notification_channel", ["email", "sms", "push", "in_app"]);

/* ------------------------------------------------------------------ users */
export const users = pgTable(
  "users",
  {
    id: id(),
    clerkId: text("clerk_id").notNull().unique(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("pending_verification"),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    country: text("country"),
    nativeLanguage: text("native_language"),
    timezone: text("timezone").notNull().default("UTC"),
    avatarUrl: text("avatar_url"),
    /** Students must be 13 or older (checked at registration). */
    birthDate: date("birth_date"),
    /** Terms of Service the user accepted (version = its effective date), when, and from which IP (evidence). */
    termsVersion: text("terms_version"),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    termsAcceptedIp: text("terms_accepted_ip"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const studentProfiles = pgTable("student_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  goal: learningGoal("goal"),
  selfLevel: selfLevel("self_level"),
  cefrLevel: cefrLevel("cefr_level"),
  /** Per-skill results of the placement test: { grammar, reading, listening, speaking } → CEFR */
  placementScores: jsonb("placement_scores").$type<Partial<Record<"grammar" | "reading" | "listening" | "speaking", string>>>(),
  /** not_started → skipped (level = own estimate) or completed (level measured by the test) */
  placementStatus: placementStatus("placement_status").notNull().default("not_started"),
  placementCompletedAt: timestamp("placement_completed_at", { withTimezone: true }),
  preferredTeacherGender: genderPref("preferred_teacher_gender").default("no_preference"),
  /** morning | afternoon | evening | weekend */
  preferredTimes: text("preferred_times").array().notNull().default(sql`'{}'::text[]`),
  updatedAt: updatedAt(),
});

/** One run of the placement test. `state` holds the drawn questions and the graded stages (keys stay server-side). */
export const placementAttempts = pgTable(
  "placement_attempts",
  {
    id: id(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: placementAttemptStatus("status").notNull().default("in_progress"),
    state: jsonb("state").$type<import("../domain/placement/engine").AttemptState>().notNull(),
    result: jsonb("result").$type<import("../domain/placement/engine").PlacementResult>(),
    startedAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("placement_attempts_student_idx").on(t.studentId, t.startedAt)],
);

/* --------------------------------------------------------------- teachers */
export const teacherProfiles = pgTable(
  "teacher_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    status: teacherStatus("status").notNull().default("draft"),
    headline: text("headline"),
    bio: text("bio"),
    city: text("city"),
    gender: genderPref("gender"),
    timezone: text("timezone").notNull(),
    education: text("education"),
    yearsExperience: smallint("years_experience").notNull().default(0),
    specialties: text("specialties").array().notNull().default(sql`'{}'::text[]`),
    /** adults | teens (students are 13+) */
    teaches: text("teaches").array().notNull().default(sql`'{}'::text[]`),
    languages: jsonb("languages").$type<{ language: string; level: string }[]>().notNull().default([]),
    certifications: jsonb("certifications").$type<{ name: string; fileUrl?: string }[]>().notNull().default([]),
    /** Price per 50-minute lesson, $20–$50 */
    priceCents: integer("price_cents").notNull().default(3000),
    offersPack5: boolean("offers_pack5").notNull().default(false),
    offersPack10: boolean("offers_pack10").notNull().default(false),
    /** Free 20-min trial is opt-in per teacher */
    offersTrial: boolean("offers_trial").notNull().default(false),
    introVideoUrl: text("intro_video_url"),
    /** When the applicant prefers the interview (weekdayMornings, weekends…). */
    interviewPreference: text("interview_preference"),
    identityStatus: identityStatus("identity_status").notNull().default("not_started"),
    stripeIdentitySessionId: text("stripe_identity_session_id"),
    stripeAccountId: text("stripe_account_id"),
    paypalEmail: text("paypal_email"),
    vacationMode: boolean("vacation_mode").notNull().default(false),
    ratingAvg: integer("rating_avg_x100").notNull().default(0), // 4.90 → 490
    ratingCount: integer("rating_count").notNull().default(0),
    lessonsCompleted: integer("lessons_completed").notNull().default(0),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("teacher_price_range", sql`${t.priceCents} between 2000 and 5000`),
    index("teacher_status_idx").on(t.status),
  ],
);

/** Admin review of a teacher application (intro video + interview). */
export const teacherApplications = pgTable("teacher_applications", {
  id: id(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.userId, { onDelete: "cascade" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  /** 1–5 scores: fluency, professionalism, teachingAbility, cameraQuality, internetQuality */
  evaluation: jsonb("evaluation").$type<Record<string, number>>(),
  adminNotes: text("admin_notes"),
  interviewRequestedAt: timestamp("interview_requested_at", { withTimezone: true }),
  decidedBy: uuid("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decision: teacherStatus("decision"),
  createdAt: createdAt(),
});

/** Weekly recurring windows, in the teacher's time zone (minutes since midnight). */
export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: id(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teacherProfiles.userId, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 1 = Monday … 7 = Sunday (ISO)
    startMinute: smallint("start_minute").notNull(),
    endMinute: smallint("end_minute").notNull(),
  },
  (t) => [
    check("rule_weekday", sql`${t.weekday} between 1 and 7`),
    check("rule_window", sql`${t.startMinute} >= 0 and ${t.endMinute} <= 1440 and ${t.startMinute} < ${t.endMinute}`),
    index("rules_teacher_idx").on(t.teacherId),
  ],
);

/** Blocked dates / holidays, inclusive, in the teacher's time zone. */
export const blockedDates = pgTable("blocked_dates", {
  id: id(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.userId, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
});

/* --------------------------------------------------------------- commerce */
/** A purchased bundle of lessons with one teacher (1, 5 or 10 lessons). */
export const lessonPackages = pgTable("lesson_packages", {
  id: id(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.userId),
  lessonCount: smallint("lesson_count").notNull(),
  lessonsUsed: smallint("lessons_used").notNull().default(0),
  unitPriceCents: integer("unit_price_cents").notNull(),
  discountPct: smallint("discount_pct").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  status: packageStatus("status").notNull().default("pending_payment"),
  createdAt: createdAt(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teacherProfiles.userId),
    packageId: uuid("package_id").references(() => lessonPackages.id),
    type: bookingType("type").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: smallint("duration_min").notNull(),
    priceCents: integer("price_cents").notNull(),
    status: bookingStatus("status").notNull().default("pending_payment"),
    topic: text("topic"),
    cancelledBy: cancelledBy("cancelled_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("bookings_teacher_time_idx").on(t.teacherId, t.startsAt),
    index("bookings_student_time_idx").on(t.studentId, t.startsAt),
    // A teacher can't hold two live bookings starting at the same instant.
    uniqueIndex("bookings_teacher_slot_uq")
      .on(t.teacherId, t.startsAt)
      .where(sql`${t.status} in ('pending_payment','confirmed')`),
  ],
);

export const payments = pgTable("payments", {
  id: id(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  packageId: uuid("package_id").references(() => lessonPackages.id),
  provider: paymentProvider("provider").notNull().default("stripe"),
  providerRef: text("provider_ref").unique(), // Stripe PaymentIntent id / PayPal order id
  amountCents: integer("amount_cents").notNull(),
  refundedCents: integer("refunded_cents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  status: paymentStatus("status").notNull().default("requires_payment"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------------- lessons */
export const lessons = pgTable("lessons", {
  id: id(),
  bookingId: uuid("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id),
  dailyRoomName: text("daily_room_name"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  attendance: attendance("attendance"),
  sharedNotes: text("shared_notes"),
});

export const lessonReports = pgTable("lesson_reports", {
  id: id(),
  lessonId: uuid("lesson_id")
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: "cascade" }),
  topicsCovered: text("topics_covered").notNull(),
  strengths: text("strengths"),
  developmentAreas: text("development_areas"),
  homework: text("homework"),
  homeworkDue: date("homework_due"),
  recommendation: text("recommendation"),
  /** Private teacher-only rating of the student, 1–5 */
  privateFluency: smallint("private_fluency"),
  privateAccuracy: smallint("private_accuracy"),
  privateEngagement: smallint("private_engagement"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const homework = pgTable("homework", {
  id: id(),
  lessonId: uuid("lesson_id").references(() => lessons.id),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.userId),
  description: text("description").notNull(),
  dueDate: date("due_date"),
  status: homeworkStatus("status").notNull().default("assigned"),
  submissionUrl: text("submission_url"),
  createdAt: createdAt(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teacherProfiles.userId),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [check("review_rating", sql`${t.rating} between 1 and 5`)],
);

/* ------------------------------------------------------ teacher earnings */
/** Ledger: one row per paid lesson taught. gross − 25% commission = net. */
export const earnings = pgTable("earnings", {
  id: id(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.userId),
  bookingId: uuid("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id),
  grossCents: integer("gross_cents").notNull(),
  commissionCents: integer("commission_cents").notNull(),
  netCents: integer("net_cents").notNull(),
  status: earningStatus("status").notNull().default("pending"),
  availableAt: timestamp("available_at", { withTimezone: true }),
  payoutId: uuid("payout_id").references(() => payouts.id),
  createdAt: createdAt(),
});

export const payouts = pgTable("payouts", {
  id: id(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teacherProfiles.userId),
  amountCents: integer("amount_cents").notNull(),
  method: paymentProvider("method").notNull().default("stripe"),
  providerRef: text("provider_ref"), // Stripe transfer id / PayPal payout id
  status: payoutStatus("status").notNull().default("requested"),
  /** true = teacher clicked "Withdraw now"; false = monthly automatic run (28th) */
  onDemand: boolean("on_demand").notNull().default(false),
  requestedAt: createdAt(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

/* -------------------------------------------------------------- messaging */
export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("conversation_pair_uq").on(t.studentId, t.teacherId)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    kind: messageKind("kind").notNull().default("text"),
    body: text("body"),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

/* ------------------------------------------------------- notifications */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // booking_confirmed, lesson_reminder, homework_assigned, payout_issued, …
    title: text("title").notNull(),
    body: text("body"),
    channels: notificationChannel("channels").array().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------ corporate & compliance */
/** "Companies can express interest and book 10, 20 or more sessions." */
export const corporateRequests = pgTable("corporate_requests", {
  id: id(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  learners: integer("learners"),
  sessions: integer("sessions"),
  needs: text("needs"),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

/** Admin actions (approve, refund, override…) — required by the security spec. */
export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  data: jsonb("data"),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ disputes */
export const disputeStatus = pgEnum("dispute_status", ["open", "refunded", "rejected"]);

/** A student reports a problem with a lesson (within 24 h after it); an admin refunds or rejects. */
export const disputes = pgTable(
  "disputes",
  {
    id: id(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    status: disputeStatus("status").notNull().default("open"),
    resolution: text("resolution"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("dispute_booking_uq").on(t.bookingId), index("dispute_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ files */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Small uploaded files (profile photos, certificates) kept in the database for now.
 * Move to object storage (S3/R2) when volumes grow; the /files/:id URLs can stay the same.
 */
export const files = pgTable(
  "files",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** avatar | certificate */
    purpose: text("purpose").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    data: bytea("data").notNull(),
    /** Avatars are public (shown on profiles); certificates only to their owner and admins. */
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("files_owner_idx").on(t.ownerId)],
);

/* ------------------------------------------------------------------ support inbox */
export const supportStatus = pgEnum("support_status", ["open", "answered", "closed"]);

/** A message sent from the public contact form (visitors, students, teachers, companies). */
export const supportMessages = pgTable(
  "support_messages",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** general | student | teacher | billing | business | technical */
    topic: text("topic").notNull(),
    message: text("message").notNull(),
    locale: text("locale"),
    /** The Amerivo account using this e-mail address, if any (shown to the admin). */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: supportStatus("status").notNull().default("open"),
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("support_status_idx").on(t.status, t.createdAt)],
);

/** An admin answer to a support message (e-mailed to the sender when e-mail is configured). */
export const supportReplies = pgTable(
  "support_replies",
  {
    id: id(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => supportMessages.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    emailed: boolean("emailed").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("support_replies_msg_idx").on(t.messageId, t.createdAt)],
);

/** Stripe/PayPal webhook idempotency. */
export const processedEvents = pgTable(
  "processed_events",
  {
    provider: paymentProvider("provider").notNull(),
    eventId: text("event_id").notNull(),
    processedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);

/* ------------------------------------------------------------ trust & safety */
export const moderationStatus = pgEnum("moderation_status", ["open", "dismissed", "warned", "blocked"]);

/**
 * Contact details (e-mail, phone, links, handles) or messaging-app names detected in a text a user
 * sent to another user (Terms §8). The text was delivered redacted; the original is kept here for
 * the admins only.
 */
export const moderationFlags = pgTable(
  "moderation_flags",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id").references(() => users.id, { onDelete: "set null" }),
    /** message | lesson_chat | lesson_notes | lesson_report | review | profile | material | booking (lesson topic) */
    context: text("context").notNull(),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    originalText: text("original_text").notNull(),
    deliveredText: text("delivered_text"),
    /** email | phone | link | handle | app */
    types: text("types").array().notNull(),
    status: moderationStatus("status").notNull().default("open"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: createdAt(),
  },
  (t) => [index("moderation_status_idx").on(t.status, t.createdAt), index("moderation_user_idx").on(t.userId, t.createdAt)],
);

/** Chat inside the live classroom: stored (and screened) by the API instead of going peer-to-peer. */
export const lessonChatMessages = pgTable(
  "lesson_chat_messages",
  {
    id: id(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lesson_chat_booking_idx").on(t.bookingId, t.createdAt)],
);

export const materialStatus = pgEnum("material_status", ["pending", "approved", "rejected"]);

/**
 * Documents a teacher shares with their students (worksheets, PDFs…). Every document is checked
 * by an admin first: students only see approved ones, from teachers they have booked.
 */
export const teachingMaterials = pgTable(
  "teaching_materials",
  {
    id: id(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .unique()
      .references(() => files.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: materialStatus("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("materials_teacher_idx").on(t.teacherId, t.createdAt), index("materials_status_idx").on(t.status, t.createdAt)],
);
