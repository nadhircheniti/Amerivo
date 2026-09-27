import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import Stripe from "stripe";

/**
 * Stripe Connect — "separate charges and transfers":
 * the platform charges the student, keeps the 20% commission, and later transfers the
 * teacher's net balance to their connected Express account (monthly or on demand).
 */
@Injectable()
export class StripeService {
  private client?: Stripe;

  /** True when a real Stripe key is configured. */
  isConfigured() {
    const key = process.env.STRIPE_SECRET_KEY;
    return !!key && !key.endsWith("xxx");
  }

  get stripe(): Stripe {
    if (!this.client) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key || key.endsWith("xxx")) throw new ServiceUnavailableException("Stripe is not configured (STRIPE_SECRET_KEY)");
      this.client = new Stripe(key);
    }
    return this.client;
  }

  /** Card, Apple Pay, Google Pay (and PayPal where Stripe supports it) via automatic payment methods. */
  createPaymentIntent(p: { amountCents: number; studentId: string; paymentId: string; description: string; idempotencyKey: string }) {
    return this.stripe.paymentIntents.create(
      {
        amount: p.amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: p.description,
        transfer_group: `payment_${p.paymentId}`,
        metadata: { paymentId: p.paymentId, studentId: p.studentId },
      },
      { idempotencyKey: p.idempotencyKey },
    );
  }

  refund(paymentIntentId: string, amountCents: number, idempotencyKey: string) {
    return this.stripe.refunds.create({ payment_intent: paymentIntentId, amount: amountCents }, { idempotencyKey });
  }

  transferToTeacher(p: { accountId: string; amountCents: number; payoutId: string }) {
    return this.stripe.transfers.create(
      { amount: p.amountCents, currency: "usd", destination: p.accountId, metadata: { payoutId: p.payoutId } },
      { idempotencyKey: `payout_${p.payoutId}` },
    );
  }

  /** Onboarding link for a teacher's Stripe Express account (bank details, W-9/1099 handled by Stripe). */
  async onboardingLink(p: { accountId?: string | null; email: string; returnUrl: string }) {
    const accountId = p.accountId ?? (await this.stripe.accounts.create({ type: "express", country: "US", email: p.email, capabilities: { transfers: { requested: true } } })).id;
    const link = await this.stripe.accountLinks.create({ account: accountId, type: "account_onboarding", refresh_url: p.returnUrl, return_url: p.returnUrl });
    return { accountId, url: link.url };
  }

  /** Stripe Identity session for teacher ID verification (spec §4 step 3). */
  identitySession(p: { teacherId: string; returnUrl: string }) {
    return this.stripe.identity.verificationSessions.create({ type: "document", metadata: { teacherId: p.teacherId }, return_url: p.returnUrl });
  }

  constructEvent(rawBody: Buffer, signature: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException("STRIPE_WEBHOOK_SECRET is not set");
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
