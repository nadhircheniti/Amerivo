"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useState } from "react";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import { useFormat } from "../_lib/format";
import type { HomeworkRow, HomeworkStatus } from "../_lib/types";

/** Marks homework done / not done (POST /student/homework/:id/complete | reopen). Demo: local only. */
export function useToggleHomework(onChange: (id: string, status: HomeworkStatus) => void) {
  const { call } = useApi();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toggle = useCallback(
    async (hw: HomeworkRow, done: boolean) => {
      const next: HomeworkStatus = done ? "completed" : "assigned";
      setError(null);
      if (!API_URL) return onChange(hw.id, next);
      setBusy(hw.id);
      try {
        const updated = await call<{ status: HomeworkStatus }>(`/student/homework/${hw.id}/${done ? "complete" : "reopen"}`, { method: "POST" });
        onChange(hw.id, updated.status);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [call, onChange],
  );
  return { toggle, busy, error };
}

/** "Due tomorrow", "Due Oct 9", or "Overdue · Oct 9", from a calendar day. */
export function useDueLabel() {
  const t = useTranslations("student.homework");
  const f = useFormat();
  return (dueDate: string | null, now: number) => {
    if (!dueDate) return { text: t("noDueDate"), urgent: false };
    const today = new Date(now).toLocaleDateString("en-CA", { timeZone: f.tz });
    const tomorrow = new Date(now + 86_400_000).toLocaleDateString("en-CA", { timeZone: f.tz });
    if (dueDate < today) return { text: t("overdue", { date: f.calendarDay(dueDate) }), urgent: true };
    if (dueDate === today) return { text: t("dueToday"), urgent: true };
    if (dueDate === tomorrow) return { text: t("dueTomorrow"), urgent: true };
    return { text: t("dueOn", { date: f.calendarDay(dueDate) }), urgent: false };
  };
}

/** Dashboard homework checklist (open items); ticking marks them done through the API. */
export function HomeworkList({ items, doneCount, now }: { items: HomeworkRow[]; doneCount: number; now: number | null }) {
  const [rows, setRows] = useState(items);
  const t = useTranslations("student.homework");
  const dueLabel = useDueLabel();
  const onChange = useCallback((id: string, status: HomeworkStatus) => setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x))), []);
  const { toggle, busy, error } = useToggleHomework(onChange);
  const doneNow = rows.filter((r) => r.status === "completed").length;
  const pending = rows.length - doneNow;

  return (
    <section className="flex flex-col gap-3.5 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby="homework-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="homework-title" className="text-[19px] font-bold">
          {t("title")}
        </h2>
        <span className="text-[13px] text-muted" aria-live="polite">
          {t("status", { pending, done: doneCount + doneNow })}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-[14px] bg-beige p-4 text-sm text-navy-soft">{t("allDone")}</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map((hw) => {
            const checked = hw.status === "completed";
            const due = now === null ? { text: "", urgent: false } : dueLabel(hw.dueDate, now);
            return (
              <li key={hw.id}>
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-[14px] p-3.5", due.urgent && !checked ? "bg-cream" : "bg-beige")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy === hw.id}
                    onChange={(e) => toggle(hw, e.target.checked)}
                    className="mt-0.5 size-[18px] shrink-0"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className={cn("text-[15px] font-semibold whitespace-pre-line", checked && "text-muted line-through")}>{hw.description}</span>
                    <span className={cn("text-[13px]", due.urgent && !checked ? "text-orange-text" : "text-muted")}>
                      {t("from", { due: checked ? t("completed") : due.text, teacher: hw.teacher.firstName })}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p className="text-sm text-danger-text" role="alert">
          {error}
        </p>
      )}
      <Link href="/student/homework" className="self-start text-sm font-semibold text-teal-dark hover:text-navy">
        {t("seeAll")}
      </Link>
    </section>
  );
}
