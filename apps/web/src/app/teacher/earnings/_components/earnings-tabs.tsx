"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { intlTags, isRtl, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { PLATFORM_COMMISSION, formatUsd, teacherNet } from "@/lib/mock-data";
import type { EarningStatus, LessonEarning, LessonKind, Payout } from "../_data";

const statusTone: Record<EarningStatus, BadgeTone> = {
  pending: "warning",
  available: "success",
  trial: "neutral",
  refunded: "danger",
};

const TABS = [
  { id: "lessons", label: "lessons", title: "recentLessons" },
  { id: "payouts", label: "payouts", title: "payouts" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const th = "border-b border-line-soft px-3 py-2.5 text-start text-[13px] font-semibold whitespace-nowrap text-muted";
const td = "border-b border-beige-2 px-3 py-[13px] text-sm whitespace-nowrap";

export function EarningsTabs({ lessons, payouts }: { lessons: LessonEarning[]; payouts: Payout[] }) {
  const t = useTranslations("teacher.earnings.tabs");
  const tStatus = useTranslations("teacher.earnings.status");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const usd = (n: number) => formatUsd(n, locale);
  const fmtDate = (iso: string) => new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  const fmtMonth = (ym: string) => new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));
  const lessonLabel = (k: LessonKind) => (k.type === "pack" ? t("pack", { size: k.size, index: k.index }) : t(k.type, { minutes: k.minutes }));
  const [tab, setTab] = useState<TabId>("lessons");
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = TABS.find((x) => x.id === tab)!;

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((x) => x.id === tab);
    // In right-to-left languages the tabs are mirrored, so ArrowLeft moves forward.
    const forward = (e.key === "ArrowRight") !== isRtl(locale);
    const next = TABS[(i + (forward ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    refs.current[next]?.focus();
  };

  return (
    <section aria-labelledby={`${base}-title`} className="flex min-w-0 flex-col gap-2.5 rounded-[22px] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${base}-title`} className="text-[17px] font-bold">
          {t(current.title)}
        </h2>
        <div role="tablist" aria-label={t("viewLabel")} className="flex gap-1.5" onKeyDown={onKey}>
          {TABS.map((x) => (
            <button
              key={x.id}
              ref={(el) => {
                refs.current[x.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${x.id}`}
              aria-selected={tab === x.id}
              aria-controls={`${base}-panel-${x.id}`}
              tabIndex={tab === x.id ? 0 : -1}
              onClick={() => setTab(x.id)}
              className={cn("h-9 rounded-full px-3.5 text-[13px]", tab === x.id ? "bg-navy text-white" : "border border-line bg-white text-navy hover:bg-beige")}
            >
              {t(x.label)}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`${base}-panel-lessons`} aria-labelledby={`${base}-tab-lessons`} hidden={tab !== "lessons"} className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{t("lessonsCaption", { percent: Math.round(PLATFORM_COMMISSION * 100) })}</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                {t("date")}
              </th>
              <th scope="col" className={th}>
                {t("student")}
              </th>
              <th scope="col" className={th}>
                {t("lesson")}
              </th>
              <th scope="col" className={th}>
                {t("price")}
              </th>
              <th scope="col" className={th}>
                {t("commission")}
              </th>
              <th scope="col" className={th}>
                {t("youEarn")}
              </th>
              <th scope="col" className={th}>
                {t("status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => {
              const noCommission = l.status === "trial" || l.status === "refunded" || l.price === 0;
              const commission = noCommission ? 0 : l.price - teacherNet(l.price);
              const net = noCommission ? 0 : teacherNet(l.price);
              return (
                <tr key={l.id}>
                  <td className={td}>{fmtDate(l.date)}</td>
                  <td className={td}>{l.student}</td>
                  <td className={td}>{lessonLabel(l.lesson)}</td>
                  <td className={td}>{usd(l.price)}</td>
                  <td className={td}>{noCommission ? <span aria-label={t("none")}>—</span> : <bdi>−{usd(commission)}</bdi>}</td>
                  <td className={cn(td, "font-semibold")}>{usd(net)}</td>
                  <td className={td}>
                    <Badge tone={statusTone[l.status]}>{tStatus(l.status)}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div role="tabpanel" id={`${base}-panel-payouts`} aria-labelledby={`${base}-tab-payouts`} hidden={tab !== "payouts"} className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{t("payoutsCaption")}</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                {t("paidOn")}
              </th>
              <th scope="col" className={th}>
                {t("period")}
              </th>
              <th scope="col" className={th}>
                {t("lessonsCol")}
              </th>
              <th scope="col" className={th}>
                {t("destination")}
              </th>
              <th scope="col" className={th}>
                {t("amount")}
              </th>
              <th scope="col" className={th}>
                {t("status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td className={td}>{fmtDate(p.date)}</td>
                <td className={td}>{fmtMonth(p.period)}</td>
                <td className={td}>{p.lessons}</td>
                <td className={td}>{p.method}</td>
                <td className={cn(td, "font-semibold")}>{usd(p.amount)}</td>
                <td className={td}>
                  <Badge tone="success">{tStatus("paid")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
