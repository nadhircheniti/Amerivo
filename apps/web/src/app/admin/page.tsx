import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { intlTags } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { PLATFORM_COMMISSION } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { BookingsTable } from "./_components/bookings-table";
import { ExportCsvButton } from "./_components/export-csv-button";
import { RefundRequests } from "./_components/refund-requests";
import { LiveOverview } from "./_components/live/overview";
import { RevenueChart } from "./_components/revenue-chart";
import { bookings } from "./_data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.overview");
  return { title: t("metaTitle") };
}

/** Sample next payout date and pending applications (placeholders until the API is connected). */
const PAYOUT_DUE = new Date("2026-10-28T00:00:00Z");
const PENDING_APPLICATIONS = 5;

export default function AdminOverviewPage() {
  // Live mode: real figures from the API. Demo mode (no API): the sample dashboard below.
  return API_URL ? <LiveOverview /> : <SampleOverview />;
}

function SampleOverview() {
  const t = useTranslations("admin.overview");
  const locale = useLocale();
  const payoutDue = new Intl.DateTimeFormat(intlTags[locale], { month: "short", day: "numeric", timeZone: "UTC" }).format(PAYOUT_DUE);
  const kpis: { id: string; label: string; value: string; hint?: string; hintClassName?: string }[] = [
    { id: "students", label: t("kpi.totalStudents"), value: "[N]", hint: t("kpi.totalStudentsHint"), hintClassName: "text-teal-dark" },
    { id: "active", label: t("kpi.activeStudents"), value: "[N]", hint: t("kpi.activeStudentsHint") },
    { id: "teachers", label: t("kpi.totalTeachers"), value: "[N]", hint: t("kpi.totalTeachersHint", { count: PENDING_APPLICATIONS }) },
    { id: "revenue", label: t("kpi.revenue"), value: "$[N]", hint: t("kpi.revenueHint", { percent: Math.round(PLATFORM_COMMISSION * 100), amount: "$[N]" }) },
    { id: "lessons", label: t("kpi.lessonsCompleted"), value: "[N]" },
    { id: "retention", label: t("kpi.retention"), value: "[N]%", hint: t("kpi.retentionHint") },
    { id: "conversion", label: t("kpi.conversion"), value: "[N]%", hint: t("kpi.conversionHint") },
    { id: "payouts", label: t("kpi.payouts"), value: "$[N]", hint: t("kpi.payoutsHint", { date: payoutDue }) },
  ];

  return (
    <div className="flex flex-col gap-[22px] px-4 py-[30px] sm:px-6 lg:px-9">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[28px]">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2.5">
          <label>
            <span className="sr-only">{t("period")}</span>
            <select defaultValue="30d" className="h-11 rounded-[10px] border border-line bg-white px-3 text-sm text-navy focus:border-teal-dark focus:outline-none">
              <option value="30d">{t("last30")}</option>
              <option value="90d">{t("last90")}</option>
              <option value="ytd">{t("thisYear")}</option>
            </select>
          </label>
          <ExportCsvButton />
        </div>
      </header>

      <section aria-label={t("keyMetrics")} className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.id} className="flex flex-col gap-1 rounded-2xl bg-white px-5 py-[18px]">
            <span className="text-[13px] text-muted">{k.label}</span>
            <span className="font-display text-[26px] leading-tight font-extrabold">{k.value}</span>
            {k.hint && <span className={cn("text-xs text-muted", k.hintClassName)}>{k.hint}</span>}
          </div>
        ))}
      </section>

      <div className="grid gap-[18px] xl:grid-cols-[1.5fr_1fr]">
        <RevenueChart />
        <RefundRequests />
      </div>

      <BookingsTable initial={bookings} />
    </div>
  );
}
