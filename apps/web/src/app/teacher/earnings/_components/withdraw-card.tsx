"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatUsd } from "@/lib/mock-data";

type Step = "idle" | "confirm" | "done";

export function WithdrawCard({ amount, lessons, destination }: { amount: number; lessons: number; destination: string }) {
  const t = useTranslations("teacher.earnings.withdraw");
  const locale = useLocale() as Locale;
  const [step, setStep] = useState<Step>("idle");
  const available = step === "done" ? 0 : amount;
  const money = formatUsd(amount, locale);

  return (
    <div className="relative flex flex-col gap-2.5 overflow-hidden rounded-[22px] bg-navy p-[26px] text-white">
      <div className="pointer-events-none absolute -end-[60px] -bottom-20 size-[200px] rounded-full bg-orange opacity-25" aria-hidden="true" />
      <span className="text-sm text-ink-soft">{t("available")}</span>
      <span className="font-display text-[34px] leading-tight font-extrabold sm:text-[38px]">{formatUsd(available, locale)}</span>
      <span className="text-[13px] text-ink-soft">{step === "done" ? t("requested") : t("fromLessons", { count: lessons })}</span>

      <div className="relative mt-1.5" aria-live="polite">
        {step === "idle" && (
          <Button size="sm" className="h-11 px-[22px]" onClick={() => setStep("confirm")} disabled={amount <= 0}>
            {t("withdrawNow")}
          </Button>
        )}
        {step === "confirm" && (
          <div className="flex flex-col gap-2.5">
            <p className="text-sm">{t.rich("confirmQuestion", { strong: (c) => <strong>{c}</strong>, amount: money, destination })}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setStep("done")}>
                {t("confirm")}
              </Button>
              <button type="button" className="h-10 rounded-full border border-white/40 px-4 text-sm font-semibold text-white hover:bg-white/10" onClick={() => setStep("idle")}>
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
        {step === "done" && <p className="text-sm text-ink-soft">{t("done", { amount: money, destination })}</p>}
      </div>
    </div>
  );
}
