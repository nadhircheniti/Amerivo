"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type HomeworkItem = { id: string; title: string; due: string; teacher: string; urgent?: boolean; done?: boolean };

/** Homework checklist with local toggle state (TODO(api): PATCH /homework/:id). */
export function HomeworkList({ items, previouslyDone }: { items: HomeworkItem[]; previouslyDone: number }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, Boolean(i.done)])));
  const doneCount = Object.values(done).filter(Boolean).length;
  const pending = items.length - doneCount;

  return (
    <section className="flex flex-col gap-3.5 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby="homework-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="homework-title" className="text-[19px] font-bold">
          Homework
        </h2>
        <span className="text-[13px] text-muted" aria-live="polite">
          {pending} pending · {previouslyDone + doneCount} done
        </span>
      </div>
      <ul className="flex flex-col gap-3.5">
        {items.map((hw) => {
          const checked = done[hw.id];
          return (
            <li key={hw.id}>
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-[14px] p-3.5", hw.urgent && !checked ? "bg-cream" : "bg-beige")}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setDone((d) => ({ ...d, [hw.id]: e.target.checked }))}
                  className="mt-0.5 size-[18px] shrink-0"
                />
                <span className="flex flex-col gap-0.5">
                  <span className={cn("text-[15px] font-semibold", checked && "text-muted line-through")}>{hw.title}</span>
                  <span className={cn("text-[13px]", hw.urgent && !checked ? "text-orange-text" : "text-muted")}>
                    {checked ? "Completed" : hw.due} · from {hw.teacher}
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
