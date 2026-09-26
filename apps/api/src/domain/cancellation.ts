/**
 * Cancellation & refund rules (spec §2 Admin, §18).
 * Student: > 24 h before start → full refund; < 24 h → no refund.
 * Teacher: student always gets a full refund, admin is notified; 3 teacher cancellations
 *          within a rolling 30 days trigger a warning.
 * Admin:  may refund a completed lesson only within 24 h after it ended (issue / complaint).
 */
export const FREE_CANCELLATION_HOURS = 24;
export const ADMIN_REFUND_WINDOW_HOURS = 24;
export const TEACHER_WARNING_THRESHOLD = 3;
export const TEACHER_WARNING_WINDOW_DAYS = 30;

const HOUR = 3_600_000;

export type Canceller = "student" | "teacher" | "admin";

export interface CancellationDecision {
  allowed: boolean;
  refundCents: number;
  reason: string;
  notifyAdmin: boolean;
}

export function decideCancellation(params: { by: Canceller; startsAt: Date; now: Date; paidCents: number }): CancellationDecision {
  const { by, startsAt, now, paidCents } = params;
  if (now.getTime() >= startsAt.getTime()) {
    return { allowed: false, refundCents: 0, reason: "The lesson has already started", notifyAdmin: false };
  }
  if (by === "teacher") {
    return { allowed: true, refundCents: paidCents, reason: "Cancelled by teacher — full refund", notifyAdmin: true };
  }
  if (by === "admin") {
    return { allowed: true, refundCents: paidCents, reason: "Cancelled by admin — full refund", notifyAdmin: false };
  }
  const hoursBefore = (startsAt.getTime() - now.getTime()) / HOUR;
  if (hoursBefore > FREE_CANCELLATION_HOURS) {
    return { allowed: true, refundCents: paidCents, reason: "Cancelled more than 24 hours before — full refund", notifyAdmin: false };
  }
  return { allowed: true, refundCents: 0, reason: "Cancelled less than 24 hours before — no refund", notifyAdmin: false };
}

export function canAdminRefundAfterLesson(endedAt: Date, now: Date) {
  const elapsed = now.getTime() - endedAt.getTime();
  return elapsed >= 0 && elapsed <= ADMIN_REFUND_WINDOW_HOURS * HOUR;
}

/** Returns true when this cancellation should trigger the "repeated cancellations" warning. */
export function teacherShouldBeWarned(recentTeacherCancellations: Date[], now: Date) {
  const since = now.getTime() - TEACHER_WARNING_WINDOW_DAYS * 24 * HOUR;
  return recentTeacherCancellations.filter((d) => d.getTime() >= since).length >= TEACHER_WARNING_THRESHOLD;
}
