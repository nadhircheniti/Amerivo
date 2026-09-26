"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";

const methods = [
  { id: "card", label: "Card" },
  { id: "apple", label: "Apple Pay" },
  { id: "google", label: "Google Pay" },
  { id: "paypal", label: "PayPal" },
] as const;
type Method = (typeof methods)[number]["id"];

export function PaymentForm({ ctaLabel }: { ctaLabel: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("card");

  return (
    <form
      className="flex flex-col gap-[26px]"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO(api): confirm the PaymentIntent with Stripe, then create the booking.
        router.push("/student");
      }}
    >
      <fieldset>
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

      {method === "card" ? (
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
          <strong>Cancellation policy.</strong> Cancel more than 24 hours before the lesson for a full refund. Lessons cancelled less than 24 hours before are
          not refunded. If your teacher cancels, you are refunded automatically.
        </p>
      </div>

      <Button type="submit" size="lg" className="h-auto py-[18px] text-[17px]">
        {ctaLabel}
      </Button>
    </form>
  );
}
