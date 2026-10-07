import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { and, eq, getTableColumns, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { auditLogs, bookings, earnings, lessonPackages, lessons, payments, processedEvents, teacherProfiles, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors";
import { isSlotAvailable } from "../../domain/availability";
import { decideCancellation, teacherShouldBeWarned, TEACHER_WARNING_WINDOW_DAYS } from "../../domain/cancellation";
import { splitEarning } from "../../domain/earnings";
import { holdCutoff } from "../../domain/holds";
import { perLessonValue, quote, PricingError, type Offer } from "../../domain/pricing";
import { ADMIN_REFUND_WINDOW_HOURS } from "../../domain/cancellation";
import type { AuthUser } from "../../auth/decorators";
import { StripeService } from "../../integrations/stripe.service";
import { NotificationsService } from "../../integrations/notifications.service";
import { TeachersService } from "../teachers/teachers.service";
import { classroomWindow } from "../../domain/classroom";
import { ModerationService } from "../moderation/moderation.service";

export interface CreateBookingInput {
  teacherSlug: string;
  offer: Offer | "from_package";
  startsAt: Date;
  packageId?: string;
  topic?: string;
}

const PG_UNIQUE_VIOLATION = "23505";

const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === PG_UNIQUE_VIOLATION || err?.cause?.code === PG_UNIQUE_VIOLATION;
};

@Injectable()
export class BookingsService {
  private readonly log = new Logger(BookingsService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly teachers: TeachersService,
    private readonly stripe: StripeService,
    private readonly notifications: NotificationsService,
    private readonly moderation: ModerationService,
  ) {}

  /* ------------------------------------------------------------ create */
  async create(student: AuthUser, input: CreateBookingInput) {
    if (student.role !== "student") throw forbidden("Only students can book lessons");
    const teacher = await this.teachers.bySlug(input.teacherSlug);
    // The lesson topic is shown to the teacher: contact details are hidden (Terms §8).
    if (input.topic?.trim()) input = { ...input, topic: (await this.moderation.screen(student, input.topic.trim(), { context: "booking", recipientId: teacher.id })).text };
    const [pricing] = await this.db
      .select({ priceCents: teacherProfiles.priceCents, offersTrial: teacherProfiles.offersTrial, offersPack5: teacherProfiles.offersPack5, offersPack10: teacherProfiles.offersPack10 })
      .from(teacherProfiles)
      .where(eq(teacherProfiles.userId, teacher.id));

    // Lessons booked from an already-paid package: no new payment.
    if (input.offer === "from_package") return this.bookFromPackage(student, teacher.id, input);

    let q;
    try {
      q = quote(pricing, input.offer);
    } catch (e) {
      if (e instanceof PricingError) throw badRequest(e.message);
      throw e;
    }

    await this.releaseStaleHolds({ teacherId: teacher.id });
    const resumed = await this.resumePending(student.id, teacher.id, input.startsAt);
    if (resumed) return resumed;
    await this.assertSlotFree(teacher.id, input.startsAt, q.durationMin);
    if (input.offer === "trial") await this.assertFirstTrial(student.id, teacher.id);

    const firstLessonPrice = q.lessonCount > 1 ? perLessonValue(q.totalCents, q.lessonCount, 0) : q.totalCents;
    const free = q.totalCents === 0;

    let created;
    try {
      created = await this.db.transaction(async (tx) => {
        const [pkg] =
          q.lessonCount > 1
            ? await tx
                .insert(lessonPackages)
                .values({ studentId: student.id, teacherId: teacher.id, lessonCount: q.lessonCount, lessonsUsed: 1, unitPriceCents: q.unitPriceCents, discountPct: q.discountPct, totalCents: q.totalCents })
                .returning()
            : [undefined];
        const [booking] = await tx
          .insert(bookings)
          .values({
            studentId: student.id,
            teacherId: teacher.id,
            packageId: pkg?.id,
            type: input.offer === "trial" ? "trial" : pkg ? "package" : "single",
            startsAt: input.startsAt,
            durationMin: q.durationMin,
            priceCents: firstLessonPrice,
            status: free ? "confirmed" : "pending_payment",
            topic: input.topic,
            createdAt: this.clock.now(),
          })
          .returning();
        const [payment] = free
          ? [undefined]
          : await tx
              .insert(payments)
              .values({ studentId: student.id, bookingId: pkg ? undefined : booking.id, packageId: pkg?.id, amountCents: q.totalCents })
              .returning();
        return { booking, pkg, payment };
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw conflict("This time was just booked by someone else. Please pick another slot.");
      throw e;
    }

    if (free) {
      await this.notifyConfirmed(created.booking.id);
      return { booking: created.booking, package: created.pkg ?? null, payment: null };
    }

    // Staging without Stripe: PAYMENTS_SIMULATED=1 confirms the booking as if the card was charged.
    if (!this.stripe.isConfigured() && process.env.PAYMENTS_SIMULATED === "1") {
      const ref = `simulated_${created.payment!.id}`;
      await this.db.update(payments).set({ providerRef: ref }).where(eq(payments.id, created.payment!.id));
      await this.onPaymentSucceeded(`sim_evt_${created.payment!.id}`, ref);
      const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, created.booking.id));
      return { booking, package: created.pkg ?? null, payment: { id: created.payment!.id, clientSecret: null, amountCents: q.totalCents, simulated: true } };
    }

    let intent;
    try {
      intent = await this.stripe.createPaymentIntent({
        amountCents: q.totalCents,
        studentId: student.id,
        paymentId: created.payment!.id,
        description: `Amerivo English — ${q.lessonCount > 1 ? `${q.lessonCount}-lesson package` : "lesson"} with ${teacher.firstName}`,
        idempotencyKey: `pi_${created.payment!.id}`,
      });
    } catch (e) {
      // No payment could be started: free the slot at once instead of holding it for 30 minutes.
      this.log.error(`Stripe PaymentIntent failed for booking ${created.booking.id}: ${(e as Error).message}`);
      await this.expireHold(created.booking, created.payment!.id, "Payment could not be started");
      throw new ServiceUnavailableException("Payment is temporarily unavailable. Please try again in a few minutes.");
    }
    await this.db.update(payments).set({ providerRef: intent.id }).where(eq(payments.id, created.payment!.id));
    return { booking: created.booking, package: created.pkg ?? null, payment: { id: created.payment!.id, clientSecret: intent.client_secret, amountCents: q.totalCents } };
  }

  private async bookFromPackage(student: AuthUser, teacherId: string, input: CreateBookingInput) {
    if (!input.packageId) throw badRequest("packageId is required");
    const [pkg] = await this.db.select().from(lessonPackages).where(eq(lessonPackages.id, input.packageId));
    if (!pkg || pkg.studentId !== student.id || pkg.teacherId !== teacherId) throw notFound("Package");
    if (pkg.status !== "active") throw badRequest("This package is not active");
    if (pkg.lessonsUsed >= pkg.lessonCount) throw badRequest("All lessons in this package have been used");
    await this.assertSlotFree(teacherId, input.startsAt, 50);
    try {
      return await this.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(lessonPackages)
          .set({ lessonsUsed: sql`${lessonPackages.lessonsUsed} + 1`, status: pkg.lessonsUsed + 1 >= pkg.lessonCount ? "exhausted" : "active" })
          .where(and(eq(lessonPackages.id, pkg.id), eq(lessonPackages.lessonsUsed, pkg.lessonsUsed))) // optimistic lock
          .returning();
        if (!updated) throw conflict("Package was updated concurrently, please retry");
        const [booking] = await tx
          .insert(bookings)
          .values({
            studentId: student.id,
            teacherId,
            packageId: pkg.id,
            type: "package",
            startsAt: input.startsAt,
            durationMin: 50,
            priceCents: perLessonValue(pkg.totalCents, pkg.lessonCount, pkg.lessonsUsed),
            status: "confirmed",
            topic: input.topic,
            createdAt: this.clock.now(),
          })
          .returning();
        return { booking, package: updated, payment: null };
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw conflict("This time was just booked by someone else. Please pick another slot.");
      throw e;
    }
  }

  private async assertSlotFree(teacherId: string, startsAt: Date, durationMin: number) {
    const ctx = await this.teachers.scheduleContext(teacherId, startsAt, startsAt);
    const ok = isSlotAvailable({ ...ctx, viewerTz: "UTC", from: startsAt, to: startsAt, now: this.clock.now(), durationMin }, startsAt);
    if (!ok) throw conflict("This time is not available");
  }

  private async assertFirstTrial(studentId: string, teacherId: string) {
    const [existing] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.studentId, studentId), eq(bookings.teacherId, teacherId), eq(bookings.type, "trial"), ne(bookings.status, "cancelled")))
      .limit(1);
    if (existing) throw badRequest("You already had a trial lesson with this teacher");
  }

  /* --------------------------------------------------- payment webhooks */
  /** Called by the Stripe webhook. Idempotent per event id. */
  async onPaymentSucceeded(eventId: string, providerRef: string) {
    const fresh = await this.claimEvent(eventId);
    if (!fresh) return { duplicate: true };
    // Only the first confirmation counts (webhook and return-page sync can both arrive).
    const [payment] = await this.db
      .update(payments)
      .set({ status: "succeeded" })
      .where(and(eq(payments.providerRef, providerRef), eq(payments.status, "requires_payment")))
      .returning();
    if (!payment) {
      const [known] = await this.db.select({ id: payments.id }).from(payments).where(eq(payments.providerRef, providerRef));
      if (!known) this.log.warn(`Payment ${providerRef} not found`);
      return { duplicate: !!known, found: !!known };
    }
    // Paid after the hold was released (booking cancelled meanwhile): refund in full.
    const held = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(payment.packageId ? eq(bookings.packageId, payment.packageId) : eq(bookings.id, payment.bookingId!), inArray(bookings.status, ["pending_payment", "confirmed"])));
    if (held.length === 0) {
      this.log.warn(`Payment ${providerRef} succeeded for a released booking — refunding`);
      if (this.stripe.isConfigured() && providerRef.startsWith("pi_")) await this.stripe.refund(providerRef, payment.amountCents, `late_${payment.id}`);
      await this.db.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
      return { duplicate: false, found: true, refunded: true };
    }
    if (payment.packageId) {
      await this.db.update(lessonPackages).set({ status: "active" }).where(eq(lessonPackages.id, payment.packageId));
      await this.db.update(bookings).set({ status: "confirmed" }).where(and(eq(bookings.packageId, payment.packageId), eq(bookings.status, "pending_payment")));
      const confirmed = await this.db.select({ id: bookings.id }).from(bookings).where(eq(bookings.packageId, payment.packageId));
      for (const b of confirmed) await this.notifyConfirmed(b.id);
    } else if (payment.bookingId) {
      await this.db.update(bookings).set({ status: "confirmed" }).where(and(eq(bookings.id, payment.bookingId), eq(bookings.status, "pending_payment")));
      await this.notifyConfirmed(payment.bookingId);
    }
    return { duplicate: false, found: true };
  }

  async onPaymentFailed(eventId: string, providerRef: string) {
    if (!(await this.claimEvent(eventId))) return { duplicate: true };
    const [payment] = await this.db
      .update(payments)
      .set({ status: "failed" })
      .where(and(eq(payments.providerRef, providerRef), eq(payments.status, "requires_payment")))
      .returning();
    if (payment?.bookingId) await this.db.update(bookings).set({ status: "cancelled", cancelReason: "Payment failed" }).where(eq(bookings.id, payment.bookingId));
    if (payment?.packageId) {
      await this.db.update(lessonPackages).set({ status: "refunded" }).where(eq(lessonPackages.id, payment.packageId));
      await this.db.update(bookings).set({ status: "cancelled", cancelReason: "Payment failed" }).where(eq(bookings.packageId, payment.packageId));
    }
    return { duplicate: false };
  }

  /** The student's payment page calls this after paying: confirms without waiting for the webhook. */
  async syncPayment(user: AuthUser, bookingId: string) {
    const booking = await this.get(bookingId);
    if (booking.studentId !== user.id && user.role !== "admin") throw forbidden();
    if (booking.status === "pending_payment") {
      const payment = await this.paymentFor(booking);
      if (payment?.providerRef?.startsWith("pi_") && this.stripe.isConfigured()) {
        const intent = await this.stripe.retrieveIntent(payment.providerRef);
        if (intent.status === "succeeded") await this.onPaymentSucceeded(`sync_${intent.id}`, intent.id);
        else if (intent.status === "canceled") await this.onPaymentFailed(`sync_${intent.id}`, intent.id);
      }
    }
    return this.get(bookingId);
  }

  /**
   * Unpaid bookings older than PAYMENT_HOLD_MIN free their slot. A payment that went through
   * in the meantime is confirmed instead; otherwise the PaymentIntent is cancelled.
   */
  async releaseStaleHolds(filter: { teacherId?: string; studentId?: string } = {}) {
    const cutoff = holdCutoff(this.clock.now());
    const stale = await this.db
      .select()
      .from(bookings)
            .where(
        and(
          eq(bookings.status, "pending_payment"),
          lt(bookings.createdAt, cutoff),
          filter.teacherId ? eq(bookings.teacherId, filter.teacherId) : undefined,
          filter.studentId ? eq(bookings.studentId, filter.studentId) : undefined,
        ),
      );
    for (const b of stale) {
      const payment = await this.paymentFor(b);
      const ref = payment?.providerRef;
      if (ref?.startsWith("pi_") && this.stripe.isConfigured()) {
        const intent = await this.stripe.retrieveIntent(ref);
        if (intent.status === "succeeded") {
          await this.onPaymentSucceeded(`sync_${ref}`, ref);
          continue;
        }
        if (intent.status === "processing") continue; // bank still deciding: keep the hold
        const cancelled = await this.stripe.cancelIntent(ref);
        if (!cancelled) {
          // Could not cancel: it was paid in the meantime.
          const again = await this.stripe.retrieveIntent(ref);
          if (again.status === "succeeded") await this.onPaymentSucceeded(`sync_${ref}`, ref);
          continue;
        }
      }
      await this.expireHold(b, payment?.id);
    }
    return stale.length;
  }

  private async expireHold(b: typeof bookings.$inferSelect, paymentId?: string, reason = "Payment not completed in time") {
    const now = this.clock.now();
    await this.db
      .update(bookings)
      .set({ status: "cancelled", cancelledAt: now, cancelReason: reason })
      .where(and(b.packageId ? eq(bookings.packageId, b.packageId) : eq(bookings.id, b.id), eq(bookings.status, "pending_payment")));
    if (b.packageId) await this.db.update(lessonPackages).set({ status: "expired" }).where(and(eq(lessonPackages.id, b.packageId), eq(lessonPackages.status, "pending_payment")));
    if (paymentId) await this.db.update(payments).set({ status: "failed" }).where(and(eq(payments.id, paymentId), eq(payments.status, "requires_payment")));
  }

  /** Same student, same teacher, same time, still unpaid → reuse it instead of "slot taken". */
  private async resumePending(studentId: string, teacherId: string, startsAt: Date) {
    const [b] = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.studentId, studentId), eq(bookings.teacherId, teacherId), eq(bookings.startsAt, startsAt), eq(bookings.status, "pending_payment")));
    if (!b) return null;
    const payment = await this.paymentFor(b);
    const ref = payment?.providerRef;
    const intent = ref?.startsWith("pi_") && this.stripe.isConfigured() ? await this.stripe.retrieveIntent(ref) : null;
    if (intent?.status === "succeeded") {
      // Paid already (e.g. the page was closed before the confirmation): confirm it now.
      await this.onPaymentSucceeded(`sync_${intent.id}`, intent.id);
      return { booking: await this.get(b.id), package: null, payment: { id: payment!.id, clientSecret: null, amountCents: payment!.amountCents } };
    }
    if (!intent?.client_secret || intent.status === "canceled" || intent.status === "processing") {
      // The student's own unpaid booking can't be resumed: release it and book afresh.
      if (intent?.status !== "processing") await this.expireHold(b, payment?.id, "Replaced by a new booking attempt");
      return null;
    }
    const [pkg] = b.packageId ? await this.db.select().from(lessonPackages).where(eq(lessonPackages.id, b.packageId)) : [null];
    return { booking: b, package: pkg ?? null, payment: { id: payment.id, clientSecret: intent.client_secret, amountCents: payment.amountCents } };
  }

  private async paymentFor(b: { id: string; packageId: string | null }) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(b.packageId ? or(eq(payments.bookingId, b.id), eq(payments.packageId, b.packageId)) : eq(payments.bookingId, b.id));
    return payment;
  }

  private async claimEvent(eventId: string) {
    const rows = await this.db.insert(processedEvents).values({ provider: "stripe", eventId }).onConflictDoNothing().returning();
    return rows.length > 0;
  }

  /* ------------------------------------------------------------ cancel */
  async cancel(user: AuthUser, bookingId: string, reason?: string) {
    const booking = await this.get(bookingId);
    const by = user.role === "admin" ? "admin" : user.id === booking.studentId ? "student" : user.id === booking.teacherId ? "teacher" : null;
    if (!by) throw forbidden();
    if (!["pending_payment", "confirmed"].includes(booking.status)) throw badRequest(`Booking is ${booking.status}`);

    const now = this.clock.now();
    if (booking.status === "pending_payment") {
      await this.db.update(bookings).set({ status: "cancelled", cancelledBy: by, cancelledAt: now, cancelReason: reason }).where(eq(bookings.id, booking.id));
      // Stop the PaymentIntent so it can't be paid anymore. If it was paid at the same moment,
      // the success webhook finds the booking cancelled and refunds in full.
      const payment = await this.paymentFor(booking);
      if (payment?.providerRef?.startsWith("pi_") && this.stripe.isConfigured() && (await this.stripe.cancelIntent(payment.providerRef))) {
        await this.db.update(payments).set({ status: "failed" }).where(and(eq(payments.id, payment.id), eq(payments.status, "requires_payment")));
      }
      return { status: "cancelled", refundCents: 0, reason: "Cancelled before payment" };
    }

    const decision = decideCancellation({ by, startsAt: booking.startsAt, now, paidCents: booking.priceCents });
    if (!decision.allowed) throw badRequest(decision.reason);

    let refundMode: "none" | "money" | "package_credit" = "none";
    if (decision.refundCents > 0) refundMode = booking.packageId ? "package_credit" : "money";

    await this.db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({ status: refundMode === "money" ? "refunded" : "cancelled", cancelledBy: by, cancelledAt: now, cancelReason: reason ?? decision.reason })
        .where(eq(bookings.id, booking.id));
      if (refundMode === "package_credit") {
        await tx.update(lessonPackages).set({ lessonsUsed: sql`greatest(${lessonPackages.lessonsUsed} - 1, 0)`, status: "active" }).where(eq(lessonPackages.id, booking.packageId!));
      }
      await tx.insert(auditLogs).values({ actorId: user.id, action: "booking.cancel", entity: "booking", entityId: booking.id, data: { by, refundCents: decision.refundCents, refundMode } });
    });

    if (refundMode === "money") await this.refundPayment(booking.id, decision.refundCents);

    const lessonWord = booking.type === "trial" ? "trial lesson" : "lesson";
    await this.notifications.notify(booking.studentId, { type: "booking_cancelled", title: `Your ${lessonWord} was cancelled`, body: decision.reason });
    await this.notifications.notify(booking.teacherId, { type: "booking_cancelled", title: `A ${lessonWord} was cancelled`, body: decision.reason });

    if (by === "teacher") await this.checkTeacherWarning(booking.teacherId, now);
    return { status: refundMode === "money" ? "refunded" : "cancelled", refundCents: decision.refundCents, refundMode, reason: decision.reason };
  }

  private async refundPayment(bookingId: string, amountCents: number) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.bookingId, bookingId));
    if (!payment?.providerRef || payment.status !== "succeeded") return;
    await this.stripe.refund(payment.providerRef, amountCents, `refund_${bookingId}`);
    await this.db
      .update(payments)
      .set({ refundedCents: payment.refundedCents + amountCents, status: payment.refundedCents + amountCents >= payment.amountCents ? "refunded" : "partially_refunded" })
      .where(eq(payments.id, payment.id));
  }

  private async checkTeacherWarning(teacherId: string, now: Date) {
    const since = new Date(now.getTime() - TEACHER_WARNING_WINDOW_DAYS * 24 * 3600_000);
    const rows = await this.db
      .select({ at: bookings.cancelledAt })
      .from(bookings)
      .where(and(eq(bookings.teacherId, teacherId), eq(bookings.cancelledBy, "teacher"), gte(bookings.cancelledAt, since)));
    if (!teacherShouldBeWarned(rows.map((r) => r.at!), now)) return;
    await this.notifications.notify(teacherId, { type: "teacher_warning", title: "Warning: repeated cancellations", body: "You cancelled 3 lessons in the last 30 days. Further cancellations may lead to suspension." });
    const admins = await this.db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    for (const a of admins) await this.notifications.notify(a.id, { type: "teacher_warning", title: "Teacher reached 3 cancellations in 30 days", body: teacherId, channels: ["in_app"] });
  }

  /* ---------------------------------------------------------- complete */
  /** Teacher clicks "End lesson". Creates the earning (pending during the 24 h refund window). */
  async complete(teacher: AuthUser, bookingId: string, attendance: "attended" | "late" | "no_show" = "attended") {
    const booking = await this.get(bookingId);
    if (booking.teacherId !== teacher.id) throw forbidden();
    if (booking.status !== "confirmed") throw badRequest(`Booking is ${booking.status}`);
    const now = this.clock.now();
    if (now < booking.startsAt) throw badRequest("The lesson has not started yet");

    const split = splitEarning(booking.priceCents);
    return this.db.transaction(async (tx) => {
      await tx.update(bookings).set({ status: attendance === "no_show" ? "no_show" : "completed" }).where(eq(bookings.id, booking.id));
      await tx
        .insert(lessons)
        .values({ bookingId: booking.id, endedAt: now, attendance })
        .onConflictDoUpdate({ target: lessons.bookingId, set: { endedAt: now, attendance } });
      if (split.grossCents > 0) {
        await tx.insert(earnings).values({
          teacherId: booking.teacherId,
          bookingId: booking.id,
          ...split,
          status: "pending",
          availableAt: new Date(now.getTime() + ADMIN_REFUND_WINDOW_HOURS * 3600_000),
        });
      }
      await tx.update(teacherProfiles).set({ lessonsCompleted: sql`${teacherProfiles.lessonsCompleted} + 1` }).where(eq(teacherProfiles.userId, booking.teacherId));
      const [lesson] = await tx.select().from(lessons).where(eq(lessons.bookingId, booking.id));
      return { bookingId: booking.id, lessonId: lesson.id, earning: split };
    });
  }

  /* ------------------------------------------------------------- reads */
  async get(bookingId: string) {
    const [b] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!b) throw notFound("Booking");
    return b;
  }

  async assertParticipant(user: AuthUser, bookingId: string) {
    const b = await this.get(bookingId);
    if (user.role !== "admin" && user.id !== b.studentId && user.id !== b.teacherId) throw forbidden();
    return b;
  }

  async listForUser(user: AuthUser, scope: "upcoming" | "past") {
    await this.releaseStaleHolds(user.role === "teacher" ? { teacherId: user.id } : { studentId: user.id });
    const col = user.role === "teacher" ? bookings.teacherId : bookings.studentId;
    const other = user.role === "teacher" ? bookings.studentId : bookings.teacherId;
    const now = this.clock.now();
    const rows = await this.db
      .select({ ...getTableColumns(bookings), withFirstName: users.firstName, withLastName: users.lastName })
      .from(bookings)
      .leftJoin(users, eq(users.id, other))
      .where(
        and(
          eq(col, user.id),
          scope === "upcoming" ? and(gte(bookings.startsAt, now), inArray(bookings.status, ["pending_payment", "confirmed"])) : sql`${bookings.startsAt} < ${now}`,
        ),
      )
      .orderBy(bookings.startsAt)
      .limit(100);
    // opensAt/closesAt: when the classroom link can be used (same rule as POST /bookings/:id/join).
    return rows.map((b) => ({ ...b, ...classroomWindow(b) }));
  }

  private async notifyConfirmed(bookingId: string) {
    const b = await this.get(bookingId);
    const when = b.startsAt.toISOString();
    await this.notifications.notify(b.studentId, { type: "booking_confirmed", title: "Your lesson is confirmed", body: when });
    await this.notifications.notify(b.teacherId, { type: "new_booking", title: "New booking", body: when });
  }
}
