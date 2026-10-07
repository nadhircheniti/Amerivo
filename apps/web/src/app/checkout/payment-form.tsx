"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { API_URL } from "@/lib/api";
import { getStripe, stripeAppearance, stripeEnabled, stripeKeyProblem } from "@/lib/stripe";
import { useApi } from "@/lib/use-api";
import { formatUsd } from "@/lib/mock-data";
import type { Locale } from "@/i18n/config";
import { useDiscount } from "./discount";

type BookingRequest = {
  teacherSlug: string;
  offer: "trial" | "single" | "pack5" | "pack10";
  startsAt: string;
};
type BookingResponse = {
  booking: { id: string; status: string };
  payment: null | { clientSecret: string | null; simulated?: boolean };
};

/** Test environment without Stripe: the API confirms bookings without charging (PAYMENTS_SIMULATED=1). */
const simulatedPayments = !!API_URL && !stripeEnabled;

function Policy() {
  const t = useTranslations("checkout.payment");
  return (
    <div className="flex items-start gap-3.5 rounded-2xl bg-cream px-5 py-[18px] text-sm leading-relaxed">
      <Icon name="clock" size={22} className="shrink-0 text-orange-dark" />
      <p>{t.rich("policy", { strong: (c) => <strong>{c}</strong> })}</p>
    </div>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl bg-danger-100 px-5 py-4 text-sm font-semibold text-danger-text">
      {error}
    </p>
  );
}

export function PaymentForm({ ctaLabel: baseLabel, free: baseFree, booking }: { ctaLabel: string; free: boolean; booking: BookingRequest | null }) {
  const router = useRouter();
  const api = useApi();
  const t = useTranslations("checkout.payment");
  const tp = useTranslations("checkout.page");
  const locale = useLocale();
  // A discount code applied in the order summary changes the price (and can make it free).
  const discount = useDiscount();
  const free = baseFree || discount?.paidCents === 0;
  const isPack = booking?.offer === "pack5" || booking?.offer === "pack10";
  const paid = discount ? formatUsd(discount.paidCents / 100, locale as Locale) : null;
  const ctaLabel = !discount ? baseLabel : discount.paidCents === 0 ? tp("ctaFreeWithCode") : isPack ? tp("ctaPayPackage", { amount: paid! }) : tp("ctaPayLesson", { amount: paid! });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<{ bookingId: string; clientSecret: string } | null>(null);

  /** Step 1 — reserve the slot (and create the payment) with the API. */
  async function reserve() {
    // Demo mode (no API) or an old sample link: keep the prototype behaviour.
    if (!API_URL || !booking) return router.push("/student");
    if (!api.isSignedIn) {
      return router.push(`/login?${new URLSearchParams({ redirect_url: window.location.pathname + window.location.search })}`);
    }
    setPending(true);
    setError(null);
    try {
      const res = await api.call<BookingResponse>("/bookings", { method: "POST", body: JSON.stringify(discount ? { ...booking, discountCode: discount.code } : booking) });
      if (res.payment?.clientSecret && !res.payment.simulated) {
        if (!stripeEnabled) {
          // Tells whoever tests the site what is wrong with the configuration (the key itself is never shown).
          const why =
            stripeKeyProblem === "secret"
              ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY contains a secret key: use the pk_… key"
              : stripeKeyProblem === "clerk"
                ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY contains the Clerk key: use Stripe's pk_… key"
                : stripeKeyProblem === "invalid"
                  ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not a pk_… key"
                  : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing in this build";
          setError(`${t("cardsUnavailable")} (${why})`);
          return;
        }
        setIntent({ bookingId: res.booking.id, clientSecret: res.payment.clientSecret });
        return;
      }
      router.push(`/student?booked=${res.booking.id}`); // free trial or simulated payment
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  // Step 2 — Stripe's secure form (card, Apple Pay, Google Pay…). Card data never reaches our servers.
  if (intent) {
    return (
      <div className="flex flex-col gap-[26px]">
        <Elements stripe={getStripe()} options={{ clientSecret: intent.clientSecret, appearance: stripeAppearance, loader: "always", locale }}>
          <StripePay bookingId={intent.bookingId} ctaLabel={ctaLabel} />
        </Elements>
      </div>
    );
  }

  const showPrototypeFields = !free && !API_URL; // design demo only

  return (
    <form
      className="flex flex-col gap-[26px]"
      onSubmit={(e) => {
        e.preventDefault();
        void reserve();
      }}
    >
      {simulatedPayments && !free && (
        <p className="rounded-2xl bg-teal-50 px-5 py-4 text-sm text-teal-deep">{t.rich("testEnvironment", { strong: (c) => <strong>{c}</strong> })}</p>
      )}

      {stripeEnabled && !free && (
        <p className="flex items-center gap-2.5 rounded-2xl bg-beige px-5 py-4 text-sm text-navy-soft">
          <Icon name="lock" size={18} className="shrink-0 text-teal-dark" />
          {t("stripeNote")}
        </p>
      )}

      {showPrototypeFields && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("nameOnCard")} className="sm:col-span-2">
            <Input name="cardName" placeholder={t("fullName")} autoComplete="cc-name" />
          </Field>
          <Field label={t("cardNumber")} className="sm:col-span-2">
            <Input name="cardNumber" placeholder="1234 1234 1234 1234" inputMode="numeric" autoComplete="cc-number" />
          </Field>
          <Field label={t("expiry")}>
            <Input name="cardExpiry" placeholder={t("expiryPlaceholder")} autoComplete="cc-exp" />
          </Field>
          <Field label={t("cvc")}>
            <Input name="cardCvc" placeholder="123" inputMode="numeric" autoComplete="cc-csc" />
          </Field>
        </div>
      )}

      <Policy />
      <ErrorNote error={error} />

      <Button type="submit" size="lg" className="h-auto py-[18px] text-[17px]" disabled={pending}>
        {pending ? t("oneMoment") : stripeEnabled && !free ? t("continueSecure") : ctaLabel}
      </Button>
    </form>
  );
}

function StripePay({ bookingId, ctaLabel }: { bookingId: string; ctaLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { call } = useApi();
  const t = useTranslations("checkout.payment");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!stripe || !elements) return;
    setPending(true);
    setError(null);
    const returnUrl = `${window.location.origin}/checkout/complete?${new URLSearchParams({ booking: bookingId })}`;
    // Cards finish here; methods that need a bank page (3-D Secure redirect, PayPal…) come back to returnUrl.
    const { error: stripeError } = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl }, redirect: "if_required" });
    if (stripeError) {
      setError(stripeError.message ?? t("paymentFailed"));
      setPending(false);
      return;
    }
    try {
      await call(`/bookings/${bookingId}/sync-payment`, { method: "POST" });
    } catch {
      // The Stripe webhook confirms the booking anyway; the dashboard shows it once it arrives.
    }
    router.push(`/student?booked=${bookingId}`);
  }

  return (
    <form
      className="flex flex-col gap-[26px]"
      onSubmit={(e) => {
        e.preventDefault();
        void pay();
      }}
    >
      <PaymentElement options={{ layout: "tabs" }} onReady={() => setReady(true)} />
      <Policy />
      <ErrorNote error={error} />
      <Button type="submit" size="lg" className="h-auto py-[18px] text-[17px]" disabled={!ready || pending}>
        {pending ? t("processing") : ctaLabel}
      </Button>
    </form>
  );
}
