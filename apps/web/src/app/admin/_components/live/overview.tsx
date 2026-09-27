"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { RevenueChart } from "../revenue-chart";
import { LiveBookingsTable } from "./bookings";
import { DisputeCard } from "./disputes";
import type { AdminDispute, Overview } from "./types";
import { LoadGate, Notice, StaleError, centsCsv, downloadCsv, fullName, linkAction, panel, useBookingType, useFormat } from "./ui";
import { useAdminData } from "./use-admin-data";

type Period = "30" | "90" | "ytd";

/** Days since January 1st (UTC), at least 1. */
const ytdDays = () => {
  const now = new Date();
  return Math.max(1, Math.ceil((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86_400_000));
};

/** Live admin dashboard (API connected). The demo page keeps the static sample design. */
export function LiveOverview() {
  const t = useTranslations("admin.overview");
  const tl = useTranslations("admin.overview.live");
  const tb = useTranslations("admin.bookingsPage");
  const te = useTranslations("admin.enums.bookingStatus");
  const fmt = useFormat();
  const typeLabel = useBookingType();
  const [period, setPeriod] = useState<Period>("30");
  const [days] = useState(ytdDays);
  const [notice, setNotice] = useState("");
  const periodDays = period === "ytd" ? days : Number(period);
  const { data, error, retrying, reload } = useAdminData<Overview | null>(`/admin/overview?days=${periodDays}`, null);

  const kpis = (o: Overview) => [
    { id: "students", label: t("kpi.totalStudents"), value: fmt.number(o.totalStudents), hint: tl("activeStudents", { count: o.activeStudents }) },
    {
      id: "teachers",
      label: tl("activeTeachers"),
      value: fmt.number(o.activeTeachers),
      hint: t("kpi.totalTeachersHint", { count: o.pendingApplications }),
      href: o.pendingApplications > 0 ? "/admin/teachers" : undefined,
    },
    {
      id: "revenue",
      label: t("kpi.revenue"),
      value: fmt.money(o.revenueCents),
      hint: t("kpi.revenueHint", { percent: Math.round(o.commissionRate * 100), amount: fmt.money(o.commissionCents) }),
    },
    { id: "lessons", label: t("kpi.lessonsCompleted"), value: fmt.number(o.lessonsCompleted), hint: tl("allTime", { count: o.lessonsCompletedAllTime }) },
    { id: "retention", label: t("kpi.retention"), value: fmt.percent(o.retentionRate), hint: tl("retentionHint") },
    { id: "conversion", label: t("kpi.conversion"), value: fmt.percent(o.conversionRate), hint: t("kpi.conversionHint") },
    { id: "payouts", label: t("kpi.payouts"), value: fmt.money(o.payoutsDue.cents), hint: tl("payoutsHint", { date: fmt.date(o.payoutsDue.date), count: o.payoutsDue.teachers }) },
    {
      id: "disputes",
      label: tl("openDisputes"),
      value: fmt.number(o.openDisputes),
      hint: o.openDisputes > 0 ? tl("openDisputesHint") : tl("noDisputes"),
      href: o.openDisputes > 0 ? "/admin/disputes" : undefined,
      warn: o.openDisputes > 0,
    },
  ];

  const exportCsv = (o: Overview) => {
    downloadCsv("amerivo-analytics.csv", [
      [tl("csvMetric"), tl("csvValue")],
      ...kpis(o).map((k) => [k.label, k.value]),
      [],
      [tl("csvMonth"), tl("csvRevenueUsd"), tl("csvLessons")],
      ...o.months.map((m) => [m.month, centsCsv(m.revenueCents), m.lessons]),
      [],
      [tb("reference"), tb("dateUtc"), tb("student"), tb("teacher"), tb("type"), tb("amountUsd"), tb("status")],
      ...o.latestBookings.map((b) => [b.id, fmt.dateTime(b.startsAt), fullName(b.student), fullName(b.teacher), typeLabel(b), centsCsv(b.amountCents), te(b.status)]),
    ]);
  };

  return (
    <div className="flex flex-col gap-[22px] px-4 py-[30px] sm:px-6 lg:px-9">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[28px]">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{tl("subtitle")}</p>
        </div>
        <div className="flex gap-2.5">
          <label>
            <span className="sr-only">{t("period")}</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="h-11 rounded-[10px] border border-line bg-white px-3 text-sm text-navy focus:border-teal-dark focus:outline-none"
            >
              <option value="30">{t("last30")}</option>
              <option value="90">{t("last90")}</option>
              <option value="ytd">{t("thisYear")}</option>
            </select>
          </label>
          <Button variant="navy" size="sm" className="h-11 rounded-[10px] px-[18px]" onClick={() => data && exportCsv(data)} disabled={!data}>
            {tl("export")}
          </Button>
        </div>
      </header>

      <Notice text={notice} />

      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={tl("what")}>
        {(o) => (
          <>
            <StaleError error={error} reload={reload} retrying={retrying} />
            <section aria-label={t("keyMetrics")} className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {kpis(o).map((k) => (
                <div key={k.id} className="flex flex-col gap-1 rounded-2xl bg-white px-5 py-[18px]">
                  <span className="text-[13px] text-muted">{k.label}</span>
                  <span className={cn("font-display text-[26px] leading-tight font-extrabold", k.warn && "text-orange-dark")}>{k.value}</span>
                  {k.href ? (
                    <Link href={k.href} className={cn(linkAction, "text-xs")}>
                      {k.hint}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">{k.hint}</span>
                  )}
                </div>
              ))}
            </section>

            <div className="grid gap-[18px] xl:grid-cols-[1.5fr_1fr]">
              <RevenueChart months={o.months} formatMoney={fmt.money} />
              <OpenDisputes
                onResolved={(n) => {
                  setNotice(n);
                  reload();
                }}
              />
            </div>

            <section aria-labelledby="latest-h" className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="latest-h" className="text-base font-bold">
                  {tl("latestBookings")}
                </h2>
                <Link href="/admin/bookings" className={cn(linkAction, "text-sm")}>
                  {tl("allBookings")}
                </Link>
              </div>
              <LiveBookingsTable
                rows={o.latestBookings}
                caption={tl("latestBookings")}
                empty={tl("noBookings")}
                onChanged={(n) => {
                  setNotice(n);
                  reload();
                }}
              />
            </section>
          </>
        )}
      </LoadGate>
    </div>
  );
}

/** "Refund requests" card: the oldest open disputes, resolvable in place. */
function OpenDisputes({ onResolved }: { onResolved: (n: string) => void }) {
  const t = useTranslations("admin.refunds");
  const tl = useTranslations("admin.overview.live");
  const { data, error, retrying, reload } = useAdminData<AdminDispute[] | null>("/admin/disputes?status=open", null);
  return (
    <section aria-labelledby="refunds-heading" className="flex flex-col gap-3 rounded-[20px] bg-white p-5 sm:p-[22px]">
      <div className="flex items-center justify-between gap-2">
        <h2 id="refunds-heading" className="text-base font-bold">
          {t("title")}
        </h2>
        <span className="text-xs text-muted">{t("window")}</span>
      </div>
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={tl("whatDisputes")}>
        {(list) =>
          list.length === 0 ? (
            <p className="rounded-[14px] bg-beige-2 p-3.5 text-sm text-muted">{tl("noRequests")}</p>
          ) : (
            <>
              {list.slice(0, 3).map((d) => (
                <DisputeCard
                  key={d.id}
                  dispute={d}
                  compact
                  onResolved={(n) => {
                    onResolved(n);
                    reload();
                  }}
                />
              ))}
              <Link href="/admin/disputes" className={cn(linkAction, "text-sm")}>
                {list.length > 3 ? tl("seeAllRequests", { count: list.length }) : tl("openDisputesPage")}
              </Link>
            </>
          )
        }
      </LoadGate>
    </section>
  );
}
