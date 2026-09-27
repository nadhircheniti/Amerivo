"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";

type BookingRequest = {
  teacherSlug: string;
  offer: "trial" | "single" | "pack5" | "pack10";
  startsAt: string;
};
type BookingResponse = {
  booking: { id: string; status: string };
  payment: null | { clientSecret: string | null; simulated?: boolean };
};

/** Test environment: the API confirms bookings without charging (PAYMENTS_SIMULATED=1). */
const simulatedPayments = !!API_URL && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const methods = [
  { id: "card", label: "Card" },
  { id: "apple", label: "Apple Pay" },
  { id: "google", label: "Google Pay" },
  { id: "paypal", label: "PayPal" },
] as const;
type Method = (typeof methods)[number]["id"];

export function PaymentForm({ ctaLabel, free, booking }: { ctaLabel: string; free: boolean; booking: BookingRequest | null }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("card");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  async function submit() {
    // Demo mode (no API) or an old sample link: keep the prototype behaviour.
    if (!API_URL || !booking) return router.push("/student");
    if (!api.isSignedIn) {
      return router.push(`/login?${new URLSearchParams({ redirect_url: window.location.pathname + window.location.search })}`);
    }
    setPending(true);
    setError(null);
    try {
      const res = await api.call<BookingResponse>("/bookings", {
        method: "POST",
        body: JSON.stringify(booking),
      });
      if (res.payment && !res.payment.simulated && res.payment.clientSecret) {
        // TODO(stripe): confirm the PaymentIntent with Stripe's Payment Element (next step).
        setError("Card payments are being connected. Your booking is reserved and awaiting payment.");
        return;
      }
      router.push(`/student?booked=${res.booking.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-[26px]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset hidden={free}>
        <legend className="sr-only">Payment method</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {methods.map((m) => (
            <label
              key={m.id}
              className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-line bg-white text-[15px] font-semibold text-navy has-[:checked]:border-2 has-[:checked]:border-teal-dark has-[:checked]:bg-teal-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal"
            >
              <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
              {m.id === "card" && <Icon name="card" />}
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {simulatedPayments && !free && (
        <p className="rounded-2xl bg-teal-50 px-5 py-4 text-sm text-teal-deep">
          <strong>Test environment:</strong> no card is charged — the lesson is confirmed as if the payment succeeded.
        </p>
      )}

      {free ? null : method === "card" ? (
        /*
         * Placeholder fields for the design milestone. In production these are replaced by
         * Stripe's Payment Element (card data never touches our servers — PCI SAQ A).
         */
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name on card" className="sm:col-span-2">
            <Input name="cardName" placeholder="Full name" autoComplete="cc-name" />
          </Field>
          <Field label="Card number" className="sm:col-span-2">
            <Input name="cardNumber" placeholder="1234 1234 1234 1234" inputMode="numeric" autoComplete="cc-number" />
          </Field>
          <Field label="Expiry">
            <Input name="cardExpiry" placeholder="MM / YY" autoComplete="cc-exp" />
          </Field>
          <Field label="CVC">
            <Input name="cardCvc" placeholder="123" inputMode="numeric" autoComplete="cc-csc" />
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-navy-soft sm:col-span-2">
            <input type="checkbox" name="saveCard" defaultChecked className="size-[18px]" />
            Save this card for future lessons
          </label>
        </div>
      ) : (
        <p className="rounded-2xl bg-beige px-5 py-4 text-sm text-navy-soft">
          You&apos;ll confirm the payment with {methods.find((m) => m.id === method)?.label} in the next step.
        </p>
      )}

      <div className="flex items-start gap-3.5 rounded-2xl bg-cream px-5 py-[18px] text-sm leading-relaxed">
        <Icon name="clock" size={22} className="shrink-0 text-orange-dark" />
        <p>
          <strong>Cancellation policy.</strong> Cancel more than 24 hours before the lesson for a full refund. Lessons cancelled less than 24 hours before are not refunded. If your
          teacher cancels, you are refunded automatically.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-100 px-5 py-4 text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-auto py-[18px] text-[17px]" disabled={pending}>
        {pending ? "Confirming…" : ctaLabel}
      </Button>
    </form>
  );
}
