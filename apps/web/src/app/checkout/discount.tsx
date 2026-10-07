"use client";

import { useLocale, useTranslations } from "next-intl";
import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/i18n/config";
import { API_URL, ApiError } from "@/lib/api";
import { formatUsd } from "@/lib/mock-data";
import { useApi } from "@/lib/use-api";

/** A code accepted by the API (POST /discount-codes/check): the new price, before booking. */
export type AppliedDiscount = { code: string; percent: number; totalCents: number; discountCents: number; paidCents: number };

const DiscountContext = createContext<{ applied: AppliedDiscount | null; setApplied: (d: AppliedDiscount | null) => void } | null>(null);

/** The checkout's discount code, shared by the order summary and the payment form. */
export function DiscountProvider({ children }: { children: ReactNode }) {
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);
  return <DiscountContext.Provider value={{ applied, setApplied }}>{children}</DiscountContext.Provider>;
}

export const useDiscount = () => useContext(DiscountContext)?.applied ?? null;

/**
 * "Discount code" box of the order summary. The API checks the code and returns the new price; the
 * code is only reserved when the booking is made (so trying it costs nothing).
 */
export function PromoCodeBox({ teacherSlug, offer }: { teacherSlug: string; offer: "single" | "pack5" | "pack10" }) {
  const t = useTranslations("checkout.page");
  const ctx = useContext(DiscountContext);
  const { call, isSignedIn } = useApi();
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "checking">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  if (!ctx || !API_URL) return null;
  const { applied, setApplied } = ctx;

  if (applied) {
    return (
      <p role="status" className="flex items-center gap-2.5 rounded-xl bg-teal-50 px-3.5 py-3 text-sm text-teal-deep">
        <Icon name="check" size={18} strokeWidth={2.4} className="shrink-0" />
        <span className="min-w-0 flex-1 font-semibold">{t("promoApplied", { code: applied.code, percent: applied.percent })}</span>
        <button type="button" onClick={() => setApplied(null)} className="font-semibold text-teal-dark underline hover:text-navy">
          {t("promoRemove")}
        </button>
      </p>
    );
  }

  const apply = async () => {
    const code = value.trim();
    if (!code) return;
    if (!isSignedIn) {
      setError(t("promoSignIn"));
      return;
    }
    setState("checking");
    setError(null);
    try {
      setApplied(await call<AppliedDiscount>("/discount-codes/check", { method: "POST", body: JSON.stringify({ code, teacherSlug, offer }) }));
      setValue("");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? t("promoTooMany") : e instanceof ApiError && e.status === 400 ? t("promoInvalid") : t("promoError"));
    } finally {
      setState("idle");
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void apply();
      }}
    >
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t("promoCode")}
        </label>
        <input
          id={inputId}
          name="promo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("promoCode")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="h-[46px] min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm text-navy uppercase placeholder:text-muted/80 placeholder:normal-case focus:border-teal-dark focus:outline-none"
        />
        <button type="submit" disabled={state === "checking" || !value.trim()} className="h-[46px] rounded-xl border border-navy bg-white px-[18px] font-semibold text-navy hover:bg-beige disabled:opacity-60">
          {state === "checking" ? t("promoChecking") : t("apply")}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}
    </form>
  );
}

/** Total of the order summary, with the code's discount when one is applied. */
export function CheckoutTotal({ amount }: { amount: string }) {
  const t = useTranslations("checkout.page");
  const locale = useLocale() as Locale;
  const applied = useDiscount();
  return (
    <>
      {applied && (
        <div className="flex justify-between gap-4 text-teal-deep">
          <dt>{t("promoDiscount", { percent: applied.percent })}</dt>
          <dd className="text-end font-semibold">{t("discountValue", { amount: formatUsd(applied.discountCents / 100, locale) })}</dd>
        </div>
      )}
      <div className="mt-1.5 flex justify-between font-display text-xl font-extrabold">
        <dt>{t("total")}</dt>
        <dd>{applied ? formatUsd(applied.paidCents / 100, locale) : amount}</dd>
      </div>
    </>
  );
}
