"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
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

export type StripeStatus = { connected: boolean; detailsSubmitted: boolean; payoutsEnabled: boolean; requirementsDue: number; destination: { name: string | null; last4: string } | null };

/** Live payout method: Stripe Connect (Express) state with the connect / finish / manage actions. */
export function StripePayoutCard({
  status,
  failed,
  onRetry,
  onConnect,
  onManage,
}: {
  status: StripeStatus | null;
  failed: boolean;
  onRetry: () => void;
  onConnect: () => Promise<void>;
  onManage: () => Promise<void>;
}) {
  const t = useTranslations("teacher.earnings.method");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action(); // navigates away to Stripe on success
    } catch (e) {
      setError(e instanceof ApiError && e.status ? e.message : t("stripeError"));
      setBusy(false);
    }
  };
  const ready = !!status?.connected && status.detailsSubmitted && status.payoutsEnabled;
  const label = status?.destination ? `${status.destination.name ?? t("bank")} •••• ${status.destination.last4}` : t("stripeAccount");

  return (
    <section aria-labelledby="payout-method-title" className="flex flex-col gap-2.5 border-t border-line-soft pt-3.5">
      <h3 id="payout-method-title" className="font-display text-sm font-bold">
        {t("legend")}
      </h3>
      {!status ? (
        failed ? (
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-orange-text">
            {t("statusError")}
            <button type="button" onClick={onRetry} className="font-semibold text-teal-dark underline hover:text-navy">
              {t("retry")}
            </button>
          </p>
        ) : (
          <p role="status" className="text-[13px] text-muted">
            {t("checking")}
          </p>
        )
      ) : (
        <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm", ready ? "border-teal-dark bg-teal-50" : "border-transparent bg-beige")}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[11px] font-bold" aria-hidden="true">
            {t("bankBadge")}
          </span>
          <span className="flex min-w-[11rem] flex-1 flex-col">
            <span>{ready ? label : status.connected ? t("setupIncomplete") : t("notConnected")}</span>
            <span className="text-xs text-muted">{ready ? t("bankSub") : status.connected ? t("setupIncompleteSub") : t("notConnectedSub")}</span>
          </span>
          {ready ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="success">{t("connected")}</Badge>
              <button type="button" disabled={busy} onClick={() => run(onManage)} className="font-semibold text-teal-dark hover:text-navy disabled:opacity-50">
                {t("manage")}
              </button>
            </span>
          ) : (
            <Button variant="teal" size="sm" disabled={busy} onClick={() => run(onConnect)} className="shrink-0">
              {busy ? t("redirecting") : status.connected ? t("finishSetup") : t("connect")}
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger-text">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">{t("stripeNote")}</p>
    </section>
  );
}
