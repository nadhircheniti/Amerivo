import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { earnings, payouts, teacherProfiles } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest } from "../../common/errors";
import { balances, canWithdraw, MIN_WITHDRAWAL_CENTS, nextMonthlyPayoutDate } from "../../domain/earnings";
import { StripeService } from "../../integrations/stripe.service";
import { NotificationsService } from "../../integrations/notifications.service";

@Injectable()
export class EarningsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly stripe: StripeService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Moves earnings whose 24 h refund window has passed from pending → available. */
  async release(now = this.clock.now()) {
    return this.db
      .update(earnings)
      .set({ status: "available" })
      .where(and(eq(earnings.status, "pending"), lte(earnings.availableAt, now)))
      .returning({ id: earnings.id });
  }

  async summary(teacherId: string) {
    await this.release();
    const rows = await this.db.select().from(earnings).where(eq(earnings.teacherId, teacherId)).orderBy(desc(earnings.createdAt));
    const history = await this.db.select().from(payouts).where(eq(payouts.teacherId, teacherId)).orderBy(desc(payouts.requestedAt)).limit(24);
    return { ...balances(rows), nextPayoutDate: nextMonthlyPayoutDate(this.clock.now()), minWithdrawalCents: MIN_WITHDRAWAL_CENTS, lessons: rows.slice(0, 50), payouts: history };
  }

  /** "Withdraw now" (on demand) or the monthly run (onDemand = false). */
  async payout(teacherId: string, onDemand: boolean) {
    await this.release();
    const [profile] = await this.db.select({ accountId: teacherProfiles.stripeAccountId }).from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId));
    if (!profile?.accountId) throw badRequest("Connect your bank account (Stripe) before withdrawing");
    // The Express account must have finished onboarding before Stripe accepts transfers to it.
    if (!(await this.payoutsReady(profile.accountId))) throw badRequest("Finish setting up your Stripe account before withdrawing");

    const payout = await this.db.transaction(async (tx) => {
      const available = await tx.select().from(earnings).where(and(eq(earnings.teacherId, teacherId), eq(earnings.status, "available"))).for("update");
      const amount = available.reduce((a, r) => a + r.netCents, 0);
      if (onDemand && !canWithdraw(amount)) throw badRequest(`Minimum withdrawal is $${MIN_WITHDRAWAL_CENTS / 100}`);
      if (amount === 0) return null;
      const [p] = await tx.insert(payouts).values({ teacherId, amountCents: amount, onDemand, status: "processing" }).returning();
      await tx.update(earnings).set({ status: "paid", payoutId: p.id }).where(inArray(earnings.id, available.map((r) => r.id)));
      return p;
    });
    if (!payout) return null;

    try {
      const transfer = await this.stripe.transferToTeacher({ accountId: profile.accountId, amountCents: payout.amountCents, payoutId: payout.id });
      await this.db.update(payouts).set({ status: "paid", providerRef: transfer.id, paidAt: this.clock.now() }).where(eq(payouts.id, payout.id));
    } catch (e) {
      // Put the money back so it can be retried.
      await this.db.update(payouts).set({ status: "failed" }).where(eq(payouts.id, payout.id));
      await this.db.update(earnings).set({ status: "available", payoutId: null }).where(eq(earnings.payoutId, payout.id));
      throw e;
    }
    await this.notifications.notify(teacherId, { type: "payout_issued", title: "Payout issued", body: `$${(payout.amountCents / 100).toFixed(2)} is on its way to your bank.` });
    return payout;
  }

  /**
   * True when the connected account can receive transfers. When Stripe can't be asked (older test
   * fakes, network error) the transfer itself is attempted and reports the real problem.
   */
  async payoutsReady(accountId: string) {
    const stripe = this.stripe as Partial<Pick<StripeService, "retrieveAccount">>;
    if (typeof stripe.retrieveAccount !== "function") return true;
    try {
      const acct = await stripe.retrieveAccount(accountId);
      return !!acct.details_submitted && (acct.payouts_enabled || acct.capabilities?.transfers === "active");
    } catch {
      return true;
    }
  }

  /** Monthly automatic payout for every teacher with an available balance (run by a scheduler on the 28th). */
  async monthlyRun() {
    await this.release();
    const teachers = await this.db.selectDistinct({ teacherId: earnings.teacherId }).from(earnings).where(eq(earnings.status, "available"));
    const results = [];
    for (const t of teachers) {
      try {
        results.push({ teacherId: t.teacherId, payout: await this.payout(t.teacherId, false) });
      } catch (e) {
        results.push({ teacherId: t.teacherId, error: String(e) });
      }
    }
    return results;
  }
}
