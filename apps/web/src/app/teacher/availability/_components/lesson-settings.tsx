"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import { formatUsd, packagePrice } from "@/lib/mock-data";

export function LessonSettings({ price, trial, pack5, pack10 }: { price: number; trial: boolean; pack5: boolean; pack10: boolean }) {
  const t = useTranslations("teacher.availability.settings");
  const locale = useLocale() as Locale;
  const [offersTrial, setOffersTrial] = useState(trial);
  const [p5, setP5] = useState(pack5);
  const [p10, setP10] = useState(pack10);

  return (
    <section aria-labelledby="settings-heading" className="flex flex-col gap-2.5 rounded-3xl bg-navy p-6 text-white">
      <h2 id="settings-heading" className="text-[17px] font-bold text-white">
        {t("title")}
      </h2>
      <dl className="flex flex-col gap-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">{t("standardLesson")}</dt>
          <dd className="font-bold">{t("standardValue", { minutes: 50, price: formatUsd(price, locale).replace(/[.,]00(?!\d)/, "") })}</dd>
        </div>
      </dl>
      <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-white/15 pt-3 text-sm">
        <span>
          <strong>{t("offerTrial")}</strong>
          <span className="block text-xs text-ink-soft">{offersTrial ? t("trialVisible") : t("trialHidden")}</span>
        </span>
        <input type="checkbox" checked={offersTrial} onChange={(e) => setOffersTrial(e.target.checked)} className="size-5" />
      </label>
      <fieldset className="mt-1 flex flex-col gap-2 border-t border-white/15 pt-3">
        <legend className="float-start mb-1 w-full text-sm text-ink-soft">{t("packages")}</legend>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>
            <strong>{t("pack", { count: 5, discount: 5 })}</strong>
            <span className="block text-xs text-ink-soft">{t("total", { price: formatUsd(packagePrice(price, 5), locale) })}</span>
          </span>
          <input type="checkbox" checked={p5} onChange={(e) => setP5(e.target.checked)} className="size-5" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>
            <strong>{t("pack", { count: 10, discount: 10 })}</strong>
            <span className="block text-xs text-ink-soft">{t("total", { price: formatUsd(packagePrice(price, 10), locale) })}</span>
          </span>
          <input type="checkbox" checked={p10} onChange={(e) => setP10(e.target.checked)} className="size-5" />
        </label>
      </fieldset>
    </section>
  );
}
