"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatUsd, packagePrice } from "@/lib/mock-data";
import type { LessonSettingsPatch } from "./types";

const MIN_PRICE = 20;
const MAX_PRICE = 50;

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/**
 * Price, free trial and packs. Without `onSave` (demo mode) the price is read-only and nothing is saved;
 * with it (live mode) the teacher edits the price and saves with PUT /teacher/profile.
 */
export function LessonSettings({
  price,
  trial,
  pack5,
  pack10,
  onSave,
}: {
  price: number;
  trial: boolean;
  pack5: boolean;
  pack10: boolean;
  onSave?: (patch: LessonSettingsPatch) => Promise<void>;
}) {
  const t = useTranslations("teacher.availability.settings");
  const locale = useLocale() as Locale;
  const id = useId();
  const [offersTrial, setOffersTrial] = useState(trial);
  const [p5, setP5] = useState(pack5);
  const [p10, setP10] = useState(pack10);
  const [priceText, setPriceText] = useState(String(price));
  const [saved, setSaved] = useState({ price, trial, pack5, pack10 });
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const priceNum = Number(priceText);
  const priceValid = priceText.trim() !== "" && Number.isInteger(priceNum) && priceNum >= MIN_PRICE && priceNum <= MAX_PRICE;
  const unit = priceValid ? priceNum : saved.price;
  const dirty = priceNum !== saved.price || offersTrial !== saved.trial || p5 !== saved.pack5 || p10 !== saved.pack10;
  const usd = (n: number) => formatUsd(n, locale).replace(/[.,]00(?!\d)/, "");

  const changed =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      if (state.kind !== "saving") setState({ kind: "idle" });
    };

  const save = async () => {
    if (!onSave || !priceValid) return;
    setState({ kind: "saving" });
    try {
      await onSave({ priceCents: priceNum * 100, offersTrial, offersPack5: p5, offersPack10: p10 });
      setSaved({ price: priceNum, trial: offersTrial, pack5: p5, pack10: p10 });
      setState({ kind: "saved" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof ApiError && e.status ? e.message : t("saveError") });
    }
  };

  return (
    <section aria-labelledby="settings-heading" className="flex flex-col gap-2.5 rounded-3xl bg-navy p-6 text-white">
      <h2 id="settings-heading" className="text-[17px] font-bold text-white">
        {t("title")}
      </h2>
      {onSave ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`${id}-price`} className="text-ink-soft">
              {t("price", { minutes: 50 })}
            </label>
            <span className="flex items-center gap-1.5 font-bold">
              <span aria-hidden="true">$</span>
              <input
                id={`${id}-price`}
                type="number"
                inputMode="numeric"
                min={MIN_PRICE}
                max={MAX_PRICE}
                step={1}
                required
                value={priceText}
                aria-invalid={!priceValid}
                aria-describedby={`${id}-price-hint`}
                onChange={(e) => changed(setPriceText)(e.target.value)}
                className={cn(
                  "h-10 w-20 rounded-[10px] border bg-white px-2.5 text-center text-[15px] font-bold text-navy focus:outline-none",
                  priceValid ? "border-line focus:border-teal-dark" : "border-danger",
                )}
              />
            </span>
          </div>
          <p id={`${id}-price-hint`} className={cn("text-xs", priceValid ? "text-ink-soft" : "font-semibold text-orange")}>
            {priceValid ? t("priceHint", { min: usd(MIN_PRICE), max: usd(MAX_PRICE) }) : t("priceInvalid", { min: MIN_PRICE, max: MAX_PRICE })}
          </p>
        </div>
      ) : (
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">{t("standardLesson")}</dt>
            <dd className="font-bold">{t("standardValue", { minutes: 50, price: usd(price) })}</dd>
          </div>
        </dl>
      )}
      <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-white/15 pt-3 text-sm">
        <span>
          <strong>{t("offerTrial")}</strong>
          <span className="block text-xs text-ink-soft">{offersTrial ? t("trialVisible") : t("trialHidden")}</span>
        </span>
        <input type="checkbox" checked={offersTrial} onChange={(e) => changed(setOffersTrial)(e.target.checked)} className="size-5" />
      </label>
      {onSave && <p className="text-xs leading-normal text-ink-soft">{t("trialExplain")}</p>}
      <fieldset className="mt-1 flex flex-col gap-2 border-t border-white/15 pt-3">
        <legend className="float-start mb-1 w-full text-sm text-ink-soft">{t("packages")}</legend>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>
            <strong>{t("pack", { count: 5, discount: 5 })}</strong>
            <span className="block text-xs text-ink-soft">{t("total", { price: formatUsd(packagePrice(unit, 5), locale) })}</span>
          </span>
          <input type="checkbox" checked={p5} onChange={(e) => changed(setP5)(e.target.checked)} className="size-5" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>
            <strong>{t("pack", { count: 10, discount: 10 })}</strong>
            <span className="block text-xs text-ink-soft">{t("total", { price: formatUsd(packagePrice(unit, 10), locale) })}</span>
          </span>
          <input type="checkbox" checked={p10} onChange={(e) => changed(setP10)(e.target.checked)} className="size-5" />
        </label>
      </fieldset>
      {onSave && (
        <div className="mt-1 flex flex-col gap-2 border-t border-white/15 pt-3">
          <Button variant="primary" size="sm" onClick={save} disabled={state.kind === "saving" || !dirty || !priceValid}>
            {state.kind === "saving" ? t("saving") : t("save")}
          </Button>
          <p role="status" className={cn("text-center text-xs", state.kind === "error" ? "font-semibold text-orange" : "text-teal-200")}>
            {state.kind === "error" ? state.message : state.kind === "saved" ? t("saved") : ""}
          </p>
        </div>
      )}
    </section>
  );
}
