"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const METHODS = [
  { id: "bank", badge: "BANK", label: "Chase •••• 4821", sub: "Bank transfer via Stripe" },
  { id: "paypal", badge: "PP", label: "PayPal · s.mitchell@example.com", sub: "Alternative · 1% PayPal fee" },
] as const;

type MethodId = (typeof METHODS)[number]["id"];

export function PayoutMethod() {
  const [method, setMethod] = useState<MethodId>("bank");
  return (
    <fieldset className="flex flex-col gap-2.5 border-t border-line-soft pt-3.5">
      <legend className="float-left mb-1 w-full font-display text-sm font-bold">Payout method</legend>
      {METHODS.map((m) => (
        <label
          key={m.id}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm outline-offset-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal",
            method === m.id ? "border-teal-dark bg-teal-50" : "border-transparent bg-beige",
          )}
        >
          <input type="radio" name="payout-method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[11px] font-bold" aria-hidden="true">
            {m.badge}
          </span>
          <span className="flex grow flex-col">
            <span>{m.label}</span>
            <span className="text-xs text-muted">{m.sub}</span>
          </span>
          {method === m.id ? <Badge tone="success">Default</Badge> : <span className="font-semibold text-teal-dark">Use this</span>}
        </label>
      ))}
    </fieldset>
  );
}
