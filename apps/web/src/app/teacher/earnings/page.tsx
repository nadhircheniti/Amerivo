import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { intlTags, type Locale } from "@/i18n/config";
import { PLATFORM_COMMISSION, formatUsd } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { EarningsTabs } from "./_components/earnings-tabs";
import { PayoutMethod } from "./_components/payout-method";
import { WithdrawCard } from "./_components/withdraw-card";
import { lessonEarnings, monthlyNet, payouts } from "./_data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.earnings");
  return { title: t("metaTitle") };
}

const CHART_HEIGHT = 160; // px of the tallest bar

export default function EarningsPage() {
  const t = useTranslations("teacher.earnings");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const max = Math.max(...monthlyNet.map((m) => m.value));
  const fmt0 = (n: number) => formatUsd(n, locale).replace(/[.,]00(?!\d)/, "");
  const monthName = (ym: string, month: "short" | "long") =>
    new Intl.DateTimeFormat(tag, { month, timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));
  const nextPayout = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date("2026-10-28T12:00:00Z"));

  return (
    <div className="flex flex-col gap-[22px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("title")}</h1>
          <p className="mt-1 text-[15px] text-muted">{t("subtitle", { percent: Math.round(PLATFORM_COMMISSION * 100) })}</p>
        </div>
        <Button variant="outline" className="shrink-0 self-start sm:self-auto">
          {t("download")}
        </Button>
      </header>

      <section aria-label={t("balances")} className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <WithdrawCard amount={644} lessons={23} destination="Chase •••• 4821" />
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-white p-[26px]">
          <span className="text-sm text-muted">{t("pending")}</span>
          <span className="font-display text-[32px] leading-tight font-extrabold">{formatUsd(448, locale)}</span>
          <span className="text-[13px] text-muted">{t("pendingHint")}</span>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-white p-[26px]">
          <span className="text-sm text-muted">{t("paidInYear", { year: "2026" })}</span>
          <span className="font-display text-[32px] leading-tight font-extrabold">{formatUsd(9380, locale)}</span>
          <span className="text-[13px] text-muted">{t("nextPayout", { date: nextPayout })}</span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <section aria-labelledby="chart-heading" className="flex flex-col gap-4 rounded-[22px] bg-white p-5 sm:p-6">
          <h2 id="chart-heading" className="text-[17px] font-bold">
            {t("chartTitle")}
          </h2>
          <figure className="m-0">
            <ul
              className="flex h-[200px] items-end gap-3.5 border-b border-line-soft pb-0.5"
              aria-label={t("chartLabel", { from: monthName(monthlyNet[0].month, "long"), to: monthName(monthlyNet[monthlyNet.length - 1].month, "long") })}
            >
              {monthlyNet.map((m) => (
                <li key={m.month} className="flex grow basis-0 flex-col items-center gap-1.5">
                  <span className={cn("text-[11px]", m.current ? "font-bold text-navy" : "text-muted")}>
                    <span className="sr-only">{monthName(m.month, "long")}: </span>
                    {fmt0(m.value)}
                    {m.current && <span className="sr-only"> {t("currentMonth")}</span>}
                  </span>
                  <div
                    className={cn("w-full rounded-t-md", m.current ? "bg-teal-dark" : "bg-teal-200")}
                    style={{ height: Math.round((m.value / max) * CHART_HEIGHT) }}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-3.5 text-xs text-muted" aria-hidden="true">
              {monthlyNet.map((m) => (
                <span key={m.month} className={cn("grow basis-0 text-center", m.current && "font-bold text-navy")}>
                  {monthName(m.month, "short")}
                </span>
              ))}
            </div>
            <figcaption className="sr-only">{t("chartCaption")}</figcaption>
          </figure>
          <PayoutMethod />
        </section>

        <EarningsTabs lessons={lessonEarnings} payouts={payouts} />
      </div>
    </div>
  );
}
