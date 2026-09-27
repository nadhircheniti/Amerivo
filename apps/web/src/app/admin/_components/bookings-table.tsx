"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { isRtl } from "@/i18n/config";
import { formatUsd } from "@/lib/mock-data";
import type { Booking, BookingStatus, BookingTab } from "../_data";
import { useBookingFormat } from "./use-booking-format";

const TABS: BookingTab[] = ["upcoming", "completed", "cancelled"];

const tone: Record<BookingStatus, BadgeTone> = {
  confirmed: "success",
  pendingPayment: "warning",
  completed: "info",
  cancelled: "danger",
  refunded: "neutral",
};

const th = "border-b border-line-soft px-3 py-2.5 text-start text-[13px] font-semibold whitespace-nowrap text-muted";
const td = "border-b border-beige-2 px-3 py-[13px] text-sm whitespace-nowrap";
const action = "font-semibold text-teal-dark hover:text-navy";

export function BookingsTable({ initial }: { initial: Booking[] }) {
  const t = useTranslations("admin.bookings");
  const locale = useLocale();
  const { formatDate, typeLabel } = useBookingFormat();
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
    // In right-to-left layouts the visual order is mirrored, so ArrowLeft moves forward.
    const forward = (e.key === "ArrowRight") !== isRtl(locale);
    const i = TABS.indexOf(tab);
    const next = TABS[(i + (forward ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next);
    refs.current[next]?.focus();
  };

  const label = (b: Booking) => `${b.student}, ${formatDate(b.dateUtc)}`;

  return (
    <section aria-labelledby={`${base}-h`} className="flex min-w-0 flex-col gap-2 rounded-[20px] bg-white p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${base}-h`} className="text-base font-bold">
          {t("title")}
        </h2>
        <div role="tablist" aria-label={t("statusTabs")} className="flex flex-wrap gap-1.5" onKeyDown={onKey}>
          {TABS.map((id) => {
            const count = rows.filter((r) => r.tab === id).length;
            return (
              <button
                key={id}
                ref={(el) => {
                  refs.current[id] = el;
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`${base}-panel`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                className={cn("h-[34px] rounded-full px-3.5 text-[13px]", tab === id ? "bg-navy text-white" : "border border-line bg-white text-navy hover:bg-beige")}
              >
                {t(`tabs.${id}`)}
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
              <th scope="col" className={th}>{t("dateUtc")}</th>
              <th scope="col" className={th}>{t("student")}</th>
              <th scope="col" className={th}>{t("teacher")}</th>
              <th scope="col" className={th}>{t("typeHeader")}</th>
              <th scope="col" className={th}>{t("amount")}</th>
              <th scope="col" className={th}>{t("statusHeader")}</th>
              <th scope="col" className={cn(th, "text-end")}>
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className={cn(td, "text-center text-muted")}>
                  {t("empty")}
                </td>
              </tr>
            )}
            {visible.map((b) => (
              <tr key={b.id}>
                <td className={td}>{formatDate(b.dateUtc)}</td>
                <td className={td}>{b.student}</td>
                <td className={td}>{b.teacher}</td>
                <td className={td}>{typeLabel(b.type)}</td>
                <td className={td}>{b.amount === null ? t("free") : formatUsd(b.amount, locale)}</td>
                <td className={td}>
                  <Badge tone={tone[b.status]}>{t(`status.${b.status}`)}</Badge>
                </td>
                <td className={cn(td, "text-end")}>
                  {rescheduling === b.id ? (
                    <form
                      className="inline-flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = new FormData(e.currentTarget).get("when");
                        if (typeof v === "string" && v) {
                          const iso = new Date(`${v}Z`).toISOString();
                          update(b.id, { dateUtc: iso });
                          setNotice(t("noticeMoved", { name: b.student, when: formatDate(iso) }));
                        }
                        setRescheduling(null);
                      }}
                    >
                      <label className="sr-only" htmlFor={`${base}-when-${b.id}`}>
                        {t("newDate", { booking: label(b) })}
                      </label>
                      <input id={`${base}-when-${b.id}`} name="when" type="datetime-local" required className="h-9 rounded-lg border border-line px-2 text-[13px]" />
                      <button type="submit" className={action}>
                        {t("save")}
                      </button>
                      <button type="button" className="text-muted hover:text-navy" onClick={() => setRescheduling(null)}>
                        {t("cancel")}
                      </button>
                    </form>
                  ) : (
                    <span className="inline-flex gap-3.5">
                      {b.tab === "upcoming" && (
                        <>
                          <button type="button" className={action} onClick={() => setRescheduling(b.id)} aria-label={t("rescheduleAria", { booking: label(b) })}>
                            {t("reschedule")}
                          </button>
                          <button
                            type="button"
                            className={action}
                            aria-label={t("cancelAria", { booking: label(b) })}
                            onClick={() => {
                              update(b.id, { tab: "cancelled", status: "cancelled" });
                              setNotice(t("noticeCancelled", { name: b.student }));
                            }}
                          >
                            {t("cancel")}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className={action}
                        aria-label={t("overrideAria", { booking: label(b) })}
                        onClick={() => {
                          if (b.status === "pendingPayment") {
                            update(b.id, { status: "confirmed" });
                            setNotice(t("noticePaid", { name: b.student }));
                          } else if (b.tab === "cancelled") {
                            update(b.id, { tab: "upcoming", status: "confirmed" });
                            setNotice(t("noticeRestored", { name: b.student }));
                          } else {
                            setNotice(t("noticeOverride", { name: b.student }));
                          }
                        }}
                      >
                        {t("override")}
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
