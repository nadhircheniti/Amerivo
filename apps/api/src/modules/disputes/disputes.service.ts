import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DB, type Db } from "../../db/db";
import { auditLogs, bookings, disputes, earnings, lessons, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors";
import { ADMIN_REFUND_WINDOW_HOURS } from "../../domain/cancellation";
import type { AuthUser } from "../../auth/decorators";
import { NotificationsService } from "../../integrations/notifications.service";
import { AdminService } from "../admin/admin.service";

export type DisputeStatus = "open" | "refunded" | "rejected";

const HOUR = 3_600_000;
const PG_UNIQUE_VIOLATION = "23505";
const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === PG_UNIQUE_VIOLATION || err?.cause?.code === PG_UNIQUE_VIOLATION;
};

/** When the lesson ended: the recorded end, otherwise the scheduled end. */
export const lessonEnd = (b: { startsAt: Date; durationMin: number }, endedAt?: Date | null) => endedAt ?? new Date(b.startsAt.getTime() + b.durationMin * 60_000);

const publicDispute = (d: typeof disputes.$inferSelect) => ({
  id: d.id,
  bookingId: d.bookingId,
  status: d.status,
  reason: d.reason,
  resolution: d.resolution,
  createdAt: d.createdAt,
  resolvedAt: d.resolvedAt,
});

/**
 * Student disputes (a problem with a lesson, reported within 24 h after it ended).
 * An admin refunds (through AdminService.refundCompletedLesson) or rejects them.
 */
@Injectable()
export class DisputesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly admin: AdminService,
    private readonly notifications: NotificationsService,
  ) {}

  private async bookingWithLesson(bookingId: string) {
    const [row] = await this.db
      .select({ b: bookings, endedAt: lessons.endedAt })
      .from(bookings)
      .leftJoin(lessons, eq(lessons.bookingId, bookings.id))
      .where(eq(bookings.id, bookingId));
    if (!row) throw notFound("Booking");
    return row;
  }

  async open(student: AuthUser, bookingId: string, reason: string) {
    const { b, endedAt } = await this.bookingWithLesson(bookingId);
    if (b.studentId !== student.id) throw forbidden();
    if (b.status !== "completed" && b.status !== "no_show") throw badRequest("Only a completed lesson can be disputed");
    const text = reason.trim();
    if (text.length < 10) throw badRequest("Please describe the problem (at least 10 characters)");
    const now = this.clock.now();
    const end = lessonEnd(b, endedAt);
    if (now.getTime() - end.getTime() > ADMIN_REFUND_WINDOW_HOURS * HOUR) throw badRequest("Problems can only be reported within 24 hours after the lesson");
    const [existing] = await this.db.select({ id: disputes.id }).from(disputes).where(eq(disputes.bookingId, b.id));
    if (existing) throw conflict("A problem was already reported for this lesson");

    let row: typeof disputes.$inferSelect;
    try {
      [row] = await this.db.insert(disputes).values({ bookingId: b.id, studentId: b.studentId, teacherId: b.teacherId, reason: text, createdAt: now }).returning();
    } catch (e) {
      if (isUniqueViolation(e)) throw conflict("A problem was already reported for this lesson");
      throw e;
    }
    // Hold the teacher's earning while the dispute is open (release() skips rows without availableAt).
    await this.db
      .update(earnings)
      .set({ availableAt: null })
      .where(and(eq(earnings.bookingId, b.id), eq(earnings.status, "pending")));
    await this.db.insert(auditLogs).values({ actorId: student.id, action: "dispute.open", entity: "booking", entityId: b.id, data: { disputeId: row.id } });
    const admins = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")));
    for (const a of admins)
      await this.notifications.notify(a.id, { type: "dispute_opened", title: "New lesson dispute to review", body: text.slice(0, 200), channels: ["in_app"] });
    return publicDispute(row);
  }

  /** The student of the booking or an admin. Null when no problem was reported. */
  async forBooking(user: AuthUser, bookingId: string) {
    const { b } = await this.bookingWithLesson(bookingId);
    if (user.role !== "admin" && user.id !== b.studentId) throw forbidden();
    const [d] = await this.db.select().from(disputes).where(eq(disputes.bookingId, b.id));
    return d ? publicDispute(d) : null;
  }

  async list(status?: DisputeStatus) {
    const student = alias(users, "student");
    const teacher = alias(users, "teacher");
    const resolver = alias(users, "resolver");
    const rows = await this.db
      .select({
        d: disputes,
        b: bookings,
        endedAt: lessons.endedAt,
        attendance: lessons.attendance,
        student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email },
        teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email },
        resolverName: sql<string | null>`nullif(trim(${resolver.firstName} || ' ' || ${resolver.lastName}), '')`,
        paymentStatus: sql<
          string | null
        >`(select p.status from payments p where p.booking_id = ${bookings.id} or (${bookings.packageId} is not null and p.package_id = ${bookings.packageId}) order by p.created_at desc limit 1)`,
      })
      .from(disputes)
      .innerJoin(bookings, eq(bookings.id, disputes.bookingId))
      .innerJoin(student, eq(student.id, disputes.studentId))
      .innerJoin(teacher, eq(teacher.id, disputes.teacherId))
      .leftJoin(resolver, eq(resolver.id, disputes.resolvedBy))
      .leftJoin(lessons, eq(lessons.bookingId, bookings.id))
      .where(status ? eq(disputes.status, status) : undefined)
      .orderBy(status === "open" || !status ? sql`(${disputes.status} = 'open') desc, ${disputes.createdAt} asc` : desc(disputes.resolvedAt));
    const now = this.clock.now().getTime();
    return rows.map((r) => ({
      ...publicDispute(r.d),
      resolvedBy: r.resolverName,
      ageHours: Math.max(0, Math.floor((now - r.d.createdAt.getTime()) / HOUR)),
      amountCents: r.b.priceCents,
      lessonDate: r.b.startsAt,
      lessonEndedAt: lessonEnd(r.b, r.endedAt),
      attendance: r.attendance,
      paymentStatus: r.paymentStatus,
      booking: {
        id: r.b.id,
        type: r.b.type,
        status: r.b.status,
        startsAt: r.b.startsAt,
        durationMin: r.b.durationMin,
        priceCents: r.b.priceCents,
        topic: r.b.topic,
        packageId: r.b.packageId,
      },
      student: r.student,
      teacher: r.teacher,
    }));
  }

  async openCount() {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(disputes)
      .where(eq(disputes.status, "open"));
    return r.n;
  }

  async resolve(admin: AuthUser, disputeId: string, decision: "refund" | "reject", note?: string) {
    const [d] = await this.db.select().from(disputes).where(eq(disputes.id, disputeId));
    if (!d) throw notFound("Dispute");
    if (d.status !== "open") throw conflict(`This dispute is already ${d.status}`);
    const message = note?.trim() || undefined;
    const now = this.clock.now();

    if (decision === "refund") {
      // Marks the dispute refunded, reverses the earning, refunds the payment and notifies the student.
      const res = await this.admin.refundCompletedLesson(admin, d.bookingId, message ?? "Refund after a reported problem");
      await this.db
        .update(disputes)
        .set({ resolution: message ?? null })
        .where(eq(disputes.id, d.id));
      await this.notifications.notify(d.teacherId, { type: "dispute_refunded", title: "A lesson was refunded after a student report", body: message });
      return { id: d.id, status: "refunded" as const, refundedCents: res.refunded };
    }

    const [done] = await this.db
      .update(disputes)
      .set({ status: "rejected", resolution: message ?? null, resolvedBy: admin.id, resolvedAt: now })
      .where(and(eq(disputes.id, d.id), eq(disputes.status, "open")))
      .returning();
    if (!done) throw conflict("This dispute was already resolved");
    // Release the held earning on the next run.
    await this.db
      .update(earnings)
      .set({ availableAt: now })
      .where(and(eq(earnings.bookingId, d.bookingId), eq(earnings.status, "pending")));
    await this.db.insert(auditLogs).values({ actorId: admin.id, action: "dispute.reject", entity: "booking", entityId: d.bookingId, data: { disputeId: d.id, note: message } });
    await this.notifications.notify(d.studentId, {
      type: "dispute_rejected",
      title: "Update on the problem you reported",
      body: message ?? "After review, this lesson is not eligible for a refund.",
    });
    await this.notifications.notify(d.teacherId, { type: "dispute_rejected", title: "A student report about your lesson was closed", body: message });
    return { id: d.id, status: "rejected" as const, refundedCents: 0 };
  }
}
