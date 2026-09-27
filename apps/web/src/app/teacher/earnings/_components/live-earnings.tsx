"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { intlTags, type Locale } from "@/i18n/config";
import { useApi } from "@/lib/use-api";
import { PLATFORM_COMMISSION, formatUsd } from "@/lib/mock-data";
import { LoadState, shortName, useLoad } from "../../_components/use-load";
import type { LessonEarning, Payout } from "../_data";
import { EarningsTabs } from "./earnings-tabs";
import { NetChart } from "./net-chart";
import { StripePayoutCard, type StripeStatus } from "./payout-method";
import { WithdrawCard } from "./withdraw-card";

type Details = {
  balances: { pendingCents: number; availableCents: number; availableLessons: number; paidCents: number; paidThisYearCents: number };
  minWithdrawalCents: number;
  nextPayoutDate: string;
  stripeConnected: boolean;
  timezone: string;
  monthly: { month: string; netCents: number }[];
  rows: {
    id: string;
    bookingId: string;
    date: string;
    type: "trial" | "single" | "package";
    durationMin: number;
    student: { id: string; firstName: string; lastName: string };
    grossCents: number;
    commissionCents: number;
    netCents: number;
    status: "pending" | "available" | "paid" | "reversed";
    availableAt: string | null;
    package: { size: number; index: number } | null;
  }[];
  payouts: { id: string; requestedAt: string; paidAt: string | null; amountCents: number; status: "requested" | "processing" | "paid" | "failed"; method: "stripe" | "paypal"; lessons: number }[];
};

/** yyyy-mm-dd of an instant in a time zone. */
const ymd = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/** Earnings page on real data: GET /teacher/earnings/details + Stripe Connect status. */
export function LiveEarnings() {
  const t = useTranslations("teacher.earnings");
  const tl = useTranslations("teacher.earnings.live");
  const tt = useTranslations("teacher.earnings.tabs");
  const tStatus = useTranslations("teacher.earnings.status");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const { call } = useApi();
  const details = useLoad<Details>("/teacher/earnings/details");
  const stripe = useLoad<StripeStatus>("/teacher/payouts/status");
  // Back from Stripe onboarding (?connect=done): the status is read again on load.
  const [returned] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("connect"));
  useEffect(() => {
    if (returned) window.history.replaceState(null, "", window.location.pathname); // clean the address
  }, [returned]);

  const connect = useCallback(async () => {
    const { url } = await call<{ url: string }>("/teacher/payouts/connect", { method: "POST" });
    window.location.assign(url);
  }, [call]);
  const manage = useCallback(async () => {
    const { url } = await call<{ url: string }>("/teacher/payouts/dashboard", { method: "POST" });
    window.location.assign(url);
  }, [call]);
  const reloadDetails = details.reload;
  const withdraw = useCallback(async () => {
    await call("/teacher/earnings/withdraw", { method: "POST" });
    await reloadDetails().catch(() => undefined);
  }, [call, reloadDetails]);

  const d = details.data;
  if (!d) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-10">
        <LoadState failed={details.failed} onRetry={details.retry} title={t("title")} />
      </div>
    );
  }

  const tz = d.timezone;
  const s = stripe.data;
  const ready = !!s && s.connected && s.detailsSubmitted && s.payoutsEnabled;
  const destination = s?.destination ? `${s.destination.name ?? tl("bank")} •••• ${s.destination.last4}` : tl("yourStripe");
  const min = d.minWithdrawalCents / 100;
  const blocked = s && !ready ? tl("needStripe") : !s && !d.stripeConnected ? tl("needStripe") : d.balances.availableCents < d.minWithdrawalCents ? tl("minimum", { min: formatUsd(min, locale) }) : null;
  const nextPayout = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(d.nextPayoutDate));
  const year = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric" }).format(new Date());

  const lessons: LessonEarning[] = d.rows.map((r) => ({
    id: r.id,
    date: ymd(r.date, tz),
    student: shortName(r.student.firstName, r.student.lastName),
    lesson: r.package ? { type: "pack", size: r.package.size, index: r.package.index } : r.type === "trial" ? { type: "trial", minutes: r.durationMin } : { type: "single", minutes: r.durationMin },
    price: r.grossCents / 100,
    commission: r.status === "reversed" ? 0 : r.commissionCents / 100,
    net: r.status === "reversed" ? 0 : r.netCents / 100,
    status: r.status === "reversed" ? "refunded" : r.status,
  }));
  const payouts: Payout[] = d.payouts.map((p) => {
    const at = p.paidAt ?? p.requestedAt;
    return { id: p.id, date: ymd(at, tz), period: ymd(at, tz).slice(0, 7), method: p.method === "paypal" ? "PayPal" : destination, lessons: p.lessons, amount: p.amountCents / 100, status: p.status };
  });
  const currentMonth = ymd(new Date().toISOString(), tz).slice(0, 7);
  const months = d.monthly.map((m) => ({ month: m.month, value: m.netCents / 100, current: m.month === currentMonth }));

  function download() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lessonLabel = (l: LessonEarning) => (l.lesson.type === "pack" ? tt("pack", { size: l.lesson.size, index: l.lesson.index }) : tt(l.lesson.type, { minutes: l.lesson.minutes }));
    const head = [tt("date"), tt("student"), tt("lesson"), tt("price"), tt("commission"), tt("youEarn"), tt("status")];
    const body = lessons.map((l) => [l.date, l.student, lessonLabel(l), l.price.toFixed(2), (l.commission ?? 0).toFixed(2), (l.net ?? 0).toFixed(2), tStatus(l.status)]);
    const csv = [head, ...body].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `amerivo-earnings-${ymd(new Date().toISOString(), tz)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="flex flex-col gap-[22px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("title")}</h1>
          <p className="mt-1 text-[15px] text-muted">{t("subtitle", { percent: Math.round(PLATFORM_COMMISSION * 100) })}</p>
        </div>
        <Button variant="outline" className="shrink-0 self-start sm:self-auto" onClick={download} disabled={!lessons.length}>
          {t("download")}
        </Button>
      </header>

      {returned && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-deep">
          <Icon name="check" size={16} strokeWidth={2.4} className="mt-0.5 shrink-0" />
          {!s ? tl("checkingStripe") : ready ? tl("stripeReady") : tl("stripeIncomplete")}
        </p>
      )}

      <section aria-label={t("balances")} className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <WithdrawCard amount={d.balances.availableCents / 100} lessons={d.balances.availableLessons} destination={destination} onWithdraw={withdraw} blocked={blocked} />
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-white p-[26px]">
          <span className="text-sm text-muted">{t("pending")}</span>
          <span className="font-display text-[32px] leading-tight font-extrabold">{formatUsd(d.balances.pendingCents / 100, locale)}</span>
          <span className="text-[13px] text-muted">{tl("pendingHint")}</span>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-white p-[26px]">
          <span className="text-sm text-muted">{t("paidInYear", { year })}</span>
          <span className="font-display text-[32px] leading-tight font-extrabold">{formatUsd(d.balances.paidThisYearCents / 100, locale)}</span>
          <span className="text-[13px] text-muted">{t("nextPayout", { date: nextPayout })}</span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <section aria-labelledby="chart-heading" className="flex flex-col gap-4 rounded-[22px] bg-white p-5 sm:p-6">
          <h2 id="chart-heading" className="text-[17px] font-bold">
            {t("chartTitle")}
          </h2>
          <NetChart months={months} />
          <StripePayoutCard status={s} failed={stripe.failed} onRetry={stripe.retry} onConnect={connect} onManage={manage} />
        </section>

        <EarningsTabs lessons={lessons} payouts={payouts} />
      </div>
    </div>
  );
}
