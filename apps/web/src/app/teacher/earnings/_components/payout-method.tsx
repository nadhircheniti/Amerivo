"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const METHODS = [
  { id: "bank", label: "Chase •••• 4821" },
  { id: "paypal", label: "PayPal · s.mitchell@example.com" },
] as const;

type MethodId = (typeof METHODS)[number]["id"];

export function PayoutMethod() {
  const t = useTranslations("teacher.earnings.method");
  const [method, setMethod] = useState<MethodId>("bank");
  const details: Record<MethodId, { badge: string; sub: string }> = {
    bank: { badge: t("bankBadge"), sub: t("bankSub") },
    paypal: { badge: "PP", sub: t("paypalSub") },
  };
  return (
    <fieldset className="flex flex-col gap-2.5 border-t border-line-soft pt-3.5">
      <legend className="float-start mb-1 w-full font-display text-sm font-bold">{t("legend")}</legend>
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
            {details[m.id].badge}
          </span>
          <span className="flex grow flex-col">
            <span>{m.label}</span>
            <span className="text-xs text-muted">{details[m.id].sub}</span>
          </span>
          {method === m.id ? <Badge tone="success">{t("default")}</Badge> : <span className="font-semibold text-teal-dark">{t("useThis")}</span>}
        </label>
      ))}
    </fieldset>
  );
}
