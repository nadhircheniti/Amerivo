"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { intlTags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

/** Due date: "tomorrow", or a calendar day (YYYY-MM-DD) shown as a weekday ("Mon") or a date ("Oct 9"). */
export type HomeworkDue = "tomorrow" | { date: string; style: "weekday" | "date" };
export type HomeworkItem = { id: string; title: string; due: HomeworkDue; teacher: string; urgent?: boolean; done?: boolean };

/** Homework checklist with local toggle state (TODO(api): PATCH /homework/:id). */
export function HomeworkList({ items, previouslyDone }: { items: HomeworkItem[]; previouslyDone: number }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, Boolean(i.done)])));
  const doneCount = Object.values(done).filter(Boolean).length;
  const pending = items.length - doneCount;
  const t = useTranslations("student.homework");
  const locale = useLocale() as Locale;
  const dueLabel = (due: HomeworkDue) => {
    if (due === "tomorrow") return t("dueTomorrow");
    const opts: Intl.DateTimeFormatOptions = due.style === "weekday" ? { weekday: "short" } : { month: "short", day: "numeric" };
    return t("dueOn", { date: new Intl.DateTimeFormat(intlTags[locale], { ...opts, timeZone: "UTC" }).format(new Date(`${due.date}T12:00:00Z`)) });
  };

  return (
    <section className="flex flex-col gap-3.5 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby="homework-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="homework-title" className="text-[19px] font-bold">
          {t("title")}
        </h2>
        <span className="text-[13px] text-muted" aria-live="polite">
          {t("status", { pending, done: previouslyDone + doneCount })}
        </span>
      </div>
      <ul className="flex flex-col gap-3.5">
        {items.map((hw) => {
          const checked = done[hw.id];
          return (
            <li key={hw.id}>
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-[14px] p-3.5", hw.urgent && !checked ? "bg-cream" : "bg-beige")}>
                <input type="checkbox" checked={checked} onChange={(e) => setDone((d) => ({ ...d, [hw.id]: e.target.checked }))} className="mt-0.5 size-[18px] shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className={cn("text-[15px] font-semibold", checked && "text-muted line-through")}>{hw.title}</span>
                  <span className={cn("text-[13px]", hw.urgent && !checked ? "text-orange-text" : "text-muted")}>
                    {t("from", { due: checked ? t("completed") : dueLabel(hw.due), teacher: hw.teacher })}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
