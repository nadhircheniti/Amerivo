"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/mock-data";
import type { Booking, BookingStatus, BookingTab } from "../_data";

const TABS: { id: BookingTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const tone: Record<BookingStatus, BadgeTone> = {
  Confirmed: "success",
  "Pending payment": "warning",
  Completed: "info",
  Cancelled: "danger",
  Refunded: "neutral",
};

const th = "border-b border-line-soft px-3 py-2.5 text-left text-[13px] font-semibold whitespace-nowrap text-muted";
const td = "border-b border-beige-2 px-3 py-[13px] text-sm whitespace-nowrap";
const action = "font-semibold text-teal-dark hover:text-navy";

export function BookingsTable({ initial }: { initial: Booking[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const [notice, setNotice] = useState("");
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visible = rows.filter((r) => r.tab === tab);

  const update = (id: string, patch: Partial<Booking>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    refs.current[next]?.focus();
  };

  const label = (b: Booking) => `${b.student}, ${b.dateUtc}`;

  return (
    <section aria-labelledby={`${base}-h`} className="flex min-w-0 flex-col gap-2 rounded-[20px] bg-white p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${base}-h`} className="text-base font-bold">
          Bookings
        </h2>
        <div role="tablist" aria-label="Booking status" className="flex gap-1.5" onKeyDown={onKey}>
          {TABS.map((t) => {
            const count = rows.filter((r) => r.tab === t.id).length;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`${base}-panel`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cn("h-[34px] rounded-full px-3.5 text-[13px]", tab === t.id ? "bg-navy text-white" : "border border-line bg-white text-navy hover:bg-beige")}
              >
                {t.label}
                <span className="sr-only"> ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className={cn("text-[13px] text-teal-deep", !notice && "sr-only")}>
        {notice}
      </p>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab}`} className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={th}>Date (UTC)</th>
              <th scope="col" className={th}>Student</th>
              <th scope="col" className={th}>Teacher</th>
              <th scope="col" className={th}>Type</th>
              <th scope="col" className={th}>Amount</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={cn(th, "text-right")}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className={cn(td, "text-center text-muted")}>
                  No bookings in this view.
                </td>
              </tr>
            )}
            {visible.map((b) => (
              <tr key={b.id}>
                <td className={td}>{b.dateUtc}</td>
                <td className={td}>{b.student}</td>
                <td className={td}>{b.teacher}</td>
                <td className={td}>{b.type}</td>
                <td className={td}>{b.amount === null ? "Free" : formatUsd(b.amount)}</td>
                <td className={td}>
                  <Badge tone={tone[b.status]}>{b.status}</Badge>
                </td>
                <td className={cn(td, "text-right")}>
                  {rescheduling === b.id ? (
                    <form
                      className="inline-flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = new FormData(e.currentTarget).get("when");
                        if (typeof v === "string" && v) {
                          const d = new Date(`${v}Z`);
                          const when = `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} · ${d.toISOString().slice(11, 16)}`;
                          update(b.id, { dateUtc: when });
                          setNotice(`Booking for ${b.student} moved to ${when} UTC. Student and teacher notified.`);
                        }
                        setRescheduling(null);
                      }}
                    >
                      <label className="sr-only" htmlFor={`${base}-when-${b.id}`}>
                        New date and time (UTC) for {label(b)}
                      </label>
                      <input id={`${base}-when-${b.id}`} name="when" type="datetime-local" required className="h-9 rounded-lg border border-line px-2 text-[13px]" />
                      <button type="submit" className={action}>
                        Save
                      </button>
                      <button type="button" className="text-muted hover:text-navy" onClick={() => setRescheduling(null)}>
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <span className="inline-flex gap-3.5">
                      {b.tab === "upcoming" && (
                        <>
                          <button type="button" className={action} onClick={() => setRescheduling(b.id)} aria-label={`Reschedule ${label(b)}`}>
                            Reschedule
                          </button>
                          <button
                            type="button"
                            className={action}
                            aria-label={`Cancel ${label(b)}`}
                            onClick={() => {
                              update(b.id, { tab: "cancelled", status: "Cancelled" });
                              setNotice(`Booking for ${b.student} cancelled. It is now in the Cancelled tab.`);
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className={action}
                        aria-label={`Override status of ${label(b)}`}
                        onClick={() => {
                          if (b.status === "Pending payment") {
                            update(b.id, { status: "Confirmed" });
                            setNotice(`Payment marked as received for ${b.student}. Override logged in the audit log.`);
                          } else if (b.tab === "cancelled") {
                            update(b.id, { tab: "upcoming", status: "Confirmed" });
                            setNotice(`Booking for ${b.student} restored to Upcoming. Override logged in the audit log.`);
                          } else {
                            setNotice(`Override for ${b.student} logged in the audit log.`);
                          }
                        }}
                      >
                        Override
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
