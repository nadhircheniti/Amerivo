"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import { samplePayments } from "../../_components/live/samples";
import type { AdminPayment, PaymentStatus, PaymentsData } from "../../_components/live/types";
import {
  Confirm,
  LoadGate,
  Notice,
  PageShell,
  Pagination,
  PillTabs,
  SearchBox,
  StaleError,
  StatusBadge,
  centsCsv,
  control,
  downloadCsv,
  fullName,
  panel,
  td,
  th,
  useDebounced,
  useFormat,
} from "../../_components/live/ui";
import { isLive, useAdminData } from "../../_components/live/use-admin-data";

type Tab = "payments" | "payouts";
const STATUSES: ("" | PaymentStatus)[] = ["", "succeeded", "partially_refunded", "refunded", "requires_payment", "failed"];

export function PaymentsScreen() {
  const t = useTranslations("admin.paymentsPage");
  const tl = useTranslations("admin.live");
  const te = useTranslations("admin.enums");
  const fmt = useFormat();
  const { call } = useApi();
  const [tab, setTab] = useState<Tab>("payments");
  const [page, setPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [status, setStatus] = useState<"" | PaymentStatus>("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmRun, setConfirmRun] = useState(false);
  const q = useDebounced(search.trim());

  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), payoutsPage: String(payoutsPage) });
    if (status) p.set("status", status);
    if (q) p.set("search", q);
    return `/admin/payments?${p}`;
  }, [page, payoutsPage, status, q]);
  const { data, error, retrying, reload } = useAdminData<PaymentsData>(path, samplePayments);

  const what = (p: AdminPayment) => (p.lessonCount ? t("forPack", { count: p.lessonCount }) : p.bookingType ? te(`bookingKind.${p.bookingType}`) : "—");

  const exportCsv = () => {
    if (!data) return;
    if (tab === "payments")
      downloadCsv("amerivo-payments.csv", [
        [t("date"), t("student"), t("email"), t("item"), t("amountUsd"), t("refundedUsd"), t("status")],
        ...data.payments.items.map((p) => [
          fmt.date(p.createdAt),
          fullName(p.student),
          p.student.email,
          what(p),
          centsCsv(p.amountCents),
          centsCsv(p.refundedCents),
          te(`paymentStatus.${p.status}`),
        ]),
      ]);
    else
      downloadCsv("amerivo-payouts.csv", [
        [t("date"), t("teacher"), t("email"), t("kind"), t("amountUsd"), t("status")],
        ...data.payouts.items.map((p) => [
          fmt.date(p.requestedAt),
          fullName(p.teacher),
          p.teacher.email,
          p.onDemand ? t("onDemand") : t("monthly"),
          centsCsv(p.amountCents),
          te(`payoutStatus.${p.status}`),
        ]),
      ]);
  };

  return (
    <PageShell
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <>
          <Button variant="outlineLight" size="sm" className="h-11 rounded-[10px] px-[18px]" onClick={() => setConfirmRun(true)} disabled={confirmRun}>
            {t("runPayouts")}
          </Button>
          <Button variant="navy" size="sm" className="h-11 rounded-[10px] px-[18px]" onClick={exportCsv} disabled={!data}>
            {t("exportCsv")}
          </Button>
        </>
      }
    >
      {confirmRun && (
        <Confirm
          question={t("confirmRun", { amount: data ? fmt.money(data.totals.availableCents) : "—" })}
          confirmLabel={t("confirmRunYes")}
          onCancel={() => setConfirmRun(false)}
          onConfirm={async () => {
            if (!isLive) throw new Error(tl("demoAction"));
            const res = await call<{ payout: { amountCents: number } | null; error?: string }[]>("/admin/payouts/run", { method: "POST" });
            const paid = res.filter((r) => r.payout);
            const failed = res.filter((r) => r.error).length;
            setConfirmRun(false);
            setNotice(t("noticeRun", { count: paid.length, amount: fmt.money(paid.reduce((a, r) => a + (r.payout?.amountCents ?? 0), 0)), failed }));
            setTab("payouts");
            setPayoutsPage(1);
            reload();
          }}
        />
      )}
      <Notice text={notice} />
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {(d) => (
          <>
            <StaleError error={error} reload={reload} retrying={retrying} />
            <section aria-label={t("totals")} className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
              {(
                [
                  { id: "gross", value: d.totals.grossCents },
                  { id: "refunded", value: d.totals.refundedCents },
                  { id: "net", value: d.totals.netCents },
                  { id: "commission", value: d.totals.commissionCents },
                  { id: "paidOut", value: d.totals.paidOutCents },
                  {
                    id: "outstanding",
                    value: d.totals.outstandingCents,
                    hint: t("outstandingHint", { date: fmt.date(d.totals.nextPayoutDate), available: fmt.money(d.totals.availableCents) }),
                  },
                ] as { id: "gross" | "refunded" | "net" | "commission" | "paidOut" | "outstanding"; value: number; hint?: string }[]
              ).map((k) => (
                <div key={k.id} className="flex flex-col gap-1 rounded-2xl bg-white px-5 py-[18px]">
                  <span className="text-[13px] text-muted">{t(`kpi.${k.id}`)}</span>
                  <span className="font-display text-[22px] leading-tight font-extrabold">{fmt.money(k.value)}</span>
                  {k.hint && <span className="text-xs text-muted">{k.hint}</span>}
                </div>
              ))}
            </section>
            {d.totals.failedPayouts > 0 && (
              <p className="rounded-xl bg-danger-100 px-4 py-2.5 text-[13px] text-danger-text">{t("failedPayouts", { count: d.totals.failedPayouts })}</p>
            )}

            <section className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PillTabs
                  label={t("view")}
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    { id: "payments", label: t("tabs.payments", { count: d.payments.total }) },
                    { id: "payouts", label: t("tabs.payouts", { count: d.payouts.total }) },
                  ]}
                />
                {tab === "payments" && (
                  <div className="flex flex-wrap gap-2">
                    <SearchBox value={search} onChange={(v) => (setSearch(v), setPage(1))} label={t("search")} placeholder={t("searchPlaceholder")} className="sm:w-[240px]" />
                    <label>
                      <span className="sr-only">{t("status")}</span>
                      <select value={status} onChange={(e) => (setStatus(e.target.value as "" | PaymentStatus), setPage(1))} className={control}>
                        {STATUSES.map((s) => (
                          <option key={s || "all"} value={s}>
                            {s ? te(`paymentStatus.${s}`) : t("allStatuses")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>

              {tab === "payments" ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <caption className="sr-only">{t("tabs.payments", { count: d.payments.total })}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className={th}>
                            {t("date")}
                          </th>
                          <th scope="col" className={th}>
                            {t("student")}
                          </th>
                          <th scope="col" className={th}>
                            {t("item")}
                          </th>
                          <th scope="col" className={cn(th, "text-end")}>
                            {t("amount")}
                          </th>
                          <th scope="col" className={cn(th, "text-end")}>
                            {t("refunded")}
                          </th>
                          <th scope="col" className={th}>
                            {t("status")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.payments.items.length === 0 && (
                          <tr>
                            <td colSpan={6} className={cn(td, "text-center text-muted")}>
                              {t("emptyPayments")}
                            </td>
                          </tr>
                        )}
                        {d.payments.items.map((p) => (
                          <tr key={p.id}>
                            <td className={td}>{fmt.dateTime(p.createdAt)}</td>
                            <td className={td}>
                              <span className="flex flex-col">
                                <span className="font-semibold">{fullName(p.student)}</span>
                                <span className="text-[13px] text-muted">{p.student.email}</span>
                              </span>
                            </td>
                            <td className={td}>{what(p)}</td>
                            <td className={cn(td, "text-end")}>{fmt.money(p.amountCents)}</td>
                            <td className={cn(td, "text-end")}>{p.refundedCents > 0 ? fmt.money(p.refundedCents) : <span className="text-muted">—</span>}</td>
                            <td className={td}>
                              <StatusBadge kind="payment" value={p.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={d.payments.page} pageSize={d.payments.pageSize} total={d.payments.total} onPage={setPage} label={t("paymentsPagination")} />
                </>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <caption className="sr-only">{t("tabs.payouts", { count: d.payouts.total })}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className={th}>
                            {t("date")}
                          </th>
                          <th scope="col" className={th}>
                            {t("teacher")}
                          </th>
                          <th scope="col" className={th}>
                            {t("kind")}
                          </th>
                          <th scope="col" className={cn(th, "text-end")}>
                            {t("amount")}
                          </th>
                          <th scope="col" className={th}>
                            {t("status")}
                          </th>
                          <th scope="col" className={th}>
                            {t("paidAt")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.payouts.items.length === 0 && (
                          <tr>
                            <td colSpan={6} className={cn(td, "text-center text-muted")}>
                              {t("emptyPayouts")}
                            </td>
                          </tr>
                        )}
                        {d.payouts.items.map((p) => (
                          <tr key={p.id}>
                            <td className={td}>{fmt.dateTime(p.requestedAt)}</td>
                            <td className={td}>
                              <span className="flex flex-col">
                                <span className="font-semibold">{fullName(p.teacher)}</span>
                                <span className="text-[13px] text-muted">{p.teacher.email}</span>
                              </span>
                            </td>
                            <td className={td}>{p.onDemand ? t("onDemand") : t("monthly")}</td>
                            <td className={cn(td, "text-end")}>{fmt.money(p.amountCents)}</td>
                            <td className={td}>
                              <StatusBadge kind="payout" value={p.status} />
                            </td>
                            <td className={td}>{p.paidAt ? fmt.dateTime(p.paidAt) : <span className="text-muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={d.payouts.page} pageSize={d.payouts.pageSize} total={d.payouts.total} onPage={setPayoutsPage} label={t("payoutsPagination")} />
                </>
              )}
            </section>
          </>
        )}
      </LoadGate>
    </PageShell>
  );
}
