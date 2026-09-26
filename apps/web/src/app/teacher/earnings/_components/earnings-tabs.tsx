"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { PLATFORM_COMMISSION, formatUsd, teacherNet } from "@/lib/mock-data";
import type { EarningStatus, LessonEarning, Payout } from "../_data";

const statusTone: Record<EarningStatus, BadgeTone> = {
  Pending: "warning",
  Available: "success",
  Trial: "neutral",
  Refunded: "danger",
};

const TABS = [
  { id: "lessons", label: "Lessons", title: "Recent lessons" },
  { id: "payouts", label: "Payout history", title: "Payout history" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const th = "border-b border-line-soft px-3 py-2.5 text-left text-[13px] font-semibold whitespace-nowrap text-muted";
const td = "border-b border-beige-2 px-3 py-[13px] text-sm whitespace-nowrap";

export function EarningsTabs({ lessons, payouts }: { lessons: LessonEarning[]; payouts: Payout[] }) {
  const [tab, setTab] = useState<TabId>("lessons");
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = TABS.find((t) => t.id === tab)!;

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    refs.current[next]?.focus();
  };

  return (
    <section aria-labelledby={`${base}-title`} className="flex min-w-0 flex-col gap-2.5 rounded-[22px] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${base}-title`} className="text-[17px] font-bold">
          {current.title}
        </h2>
        <div role="tablist" aria-label="Earnings view" className="flex gap-1.5" onKeyDown={onKey}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={cn("h-9 rounded-full px-3.5 text-[13px]", tab === t.id ? "bg-navy text-white" : "border border-line bg-white text-navy hover:bg-beige")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`${base}-panel-lessons`} aria-labelledby={`${base}-tab-lessons`} hidden={tab !== "lessons"} className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">Recent lessons with commission ({Math.round(PLATFORM_COMMISSION * 100)}%) and your net earnings</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Date</th>
              <th scope="col" className={th}>Student</th>
              <th scope="col" className={th}>Lesson</th>
              <th scope="col" className={th}>Price</th>
              <th scope="col" className={th}>Commission</th>
              <th scope="col" className={th}>You earn</th>
              <th scope="col" className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => {
              const noCommission = l.status === "Trial" || l.status === "Refunded" || l.price === 0;
              const commission = noCommission ? 0 : l.price - teacherNet(l.price);
              const net = noCommission ? 0 : teacherNet(l.price);
              return (
                <tr key={l.id}>
                  <td className={td}>{l.date}</td>
                  <td className={td}>{l.student}</td>
                  <td className={td}>{l.lesson}</td>
                  <td className={td}>{formatUsd(l.price)}</td>
                  <td className={td}>{noCommission ? <span aria-label="None">—</span> : `−${formatUsd(commission)}`}</td>
                  <td className={cn(td, "font-semibold")}>{formatUsd(net)}</td>
                  <td className={td}>
                    <Badge tone={statusTone[l.status]}>{l.status}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div role="tabpanel" id={`${base}-panel-payouts`} aria-labelledby={`${base}-tab-payouts`} hidden={tab !== "payouts"} className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">Monthly payouts sent to you</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Paid on</th>
              <th scope="col" className={th}>Period</th>
              <th scope="col" className={th}>Lessons</th>
              <th scope="col" className={th}>Destination</th>
              <th scope="col" className={th}>Amount</th>
              <th scope="col" className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td className={td}>{p.date}</td>
                <td className={td}>{p.period}</td>
                <td className={td}>{p.lessons}</td>
                <td className={td}>{p.method}</td>
                <td className={cn(td, "font-semibold")}>{formatUsd(p.amount)}</td>
                <td className={td}>
                  <Badge tone="success">Paid</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
