"use client";

import { useState } from "react";
import { formatUsd, packagePrice } from "@/lib/mock-data";

export function LessonSettings({ price, trial, pack5, pack10 }: { price: number; trial: boolean; pack5: boolean; pack10: boolean }) {
  const [offersTrial, setOffersTrial] = useState(trial);
  const [p5, setP5] = useState(pack5);
  const [p10, setP10] = useState(pack10);

  return (
    <section aria-labelledby="settings-heading" className="flex flex-col gap-2.5 rounded-3xl bg-navy p-6 text-white">
      <h2 id="settings-heading" className="text-[17px] font-bold text-white">
        Lesson settings
      </h2>
      <dl className="flex flex-col gap-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Standard lesson</dt>
          <dd className="font-bold">50 min · {formatUsd(price).replace(".00", "")}</dd>
        </div>
      </dl>
      <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-white/15 pt-3 text-sm">
        <span>
          <strong>Offer a free trial lesson</strong>
          <span className="block text-xs text-ink-soft">20 min · once per student · {offersTrial ? "visible on your profile" : "hidden from students"}</span>
        </span>
        <input type="checkbox" checked={offersTrial} onChange={(e) => setOffersTrial(e.target.checked)} className="size-5" />
      </label>
      <fieldset className="mt-1 flex flex-col gap-2 border-t border-white/15 pt-3">
        <legend className="float-left mb-1 w-full text-sm text-ink-soft">Packages (opt-in)</legend>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>
            <strong>5 lessons (−5%)</strong>
            <span className="block text-xs text-ink-soft">{formatUsd(packagePrice(price, 5))} total</span>
          </span>
          <input type="checkbox" checked={p5} onChange={(e) => setP5(e.target.checked)} className="size-5" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>
            <strong>10 lessons (−10%)</strong>
            <span className="block text-xs text-ink-soft">{formatUsd(packagePrice(price, 10))} total</span>
          </span>
          <input type="checkbox" checked={p10} onChange={(e) => setP10(e.target.checked)} className="size-5" />
        </label>
      </fieldset>
    </section>
  );
}
