"use client";

import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { PublicQuestion } from "../../_lib/types";

const LETTERS = ["A", "B", "C", "D"];

/** Prompt text; the "___" gap is drawn as a blank line. Text is English, so always left-to-right. */
export function Prompt({ text, className, id }: { text: string; className?: string; id?: string }) {
  const parts = text.split("___");
  return (
    <p id={id} dir="ltr" className={cn("text-start leading-relaxed whitespace-pre-line", className)}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className="mx-1 inline-block w-16 translate-y-[3px] border-b-2 border-navy" aria-label="blank">
              &nbsp;
            </span>
          )}
        </Fragment>
      ))}
    </p>
  );
}

/** The 4 answers of a question as large radio cards (keyboard: arrows to move, space to pick). */
export function Options({ q, value, onChange, labelledBy }: { q: PublicQuestion; value: number | undefined; onChange: (i: number) => void; labelledBy: string }) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2.5" dir="ltr">
      {q.options.map((o, i) => (
        <label
          key={i}
          className={cn(
            "flex min-h-[54px] cursor-pointer items-center gap-3.5 rounded-2xl border bg-white px-4 py-3 text-start text-[15px] transition-colors",
            value === i ? "border-2 border-teal-dark bg-teal-50 font-semibold" : "border-line hover:border-navy-soft",
            "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal",
          )}
        >
          <input type="radio" name={q.id} checked={value === i} onChange={() => onChange(i)} className="sr-only" />
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold",
              value === i ? "bg-teal-dark text-white" : "bg-beige-2 text-navy",
            )}
          >
            {LETTERS[i]}
          </span>
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}
