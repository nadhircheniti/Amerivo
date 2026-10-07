"use client";

import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { Badge, StatTile, type BadgeTone } from "@/components/ui/primitives";
import { EmptyState, Loadable, PageHeader } from "../_components/states";
import { TeacherAvatar } from "../_components/teacher-avatar";
import { demoPaymentsPage } from "../_lib/demo";
import { fullName, useFormat } from "../_lib/format";
import type { PackageRow, PaymentRow, PaymentsPage } from "../_lib/types";
import { useStudentData } from "../_lib/use-student-data";

const paymentTone: Record<PaymentRow["status"], BadgeTone> = {
  requires_payment: "warning",
  succeeded: "success",
  failed: "danger",
  refunded: "neutral",
  partially_refunded: "info",
};
const packageTone: Record<PackageRow["status"], BadgeTone> = { pending_payment: "warning", active: "success", exhausted: "neutral", refunded: "neutral", expired: "neutral" };

export function PaymentsView() {
  const t = useTranslations("student.payments");
  const state = useStudentData<PaymentsPage>("/student/payments", () => demoPaymentsPage());
  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader title={t("title")} description={t("description")} />
      <Loadable state={state}>{(d) => <Body d={d} />}</Loadable>
    </div>
  );
}

function Body({ d }: { d: PaymentsPage }) {
  const t = useTranslations("student.payments");
  const f = useFormat();
  const remaining = d.packages.filter((p) => p.status === "active").reduce((a, p) => a + p.remaining, 0);
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label={t("totalsLabel")}>
        <StatTile label={t("totalSpent")} value={f.money(d.totals.spentCents)} />
        <StatTile label={t("totalRefunded")} value={f.money(d.totals.refundedCents)} />
        <StatTile label={t("lessonsInPacks")} value={f.num(remaining)} hint={t("lessonsInPacksHint")} />
      </section>

      <section className="flex flex-col gap-3.5" aria-labelledby="packs-title">
        <h2 id="packs-title" className="text-[19px] font-bold">
          {t("packsTitle")}
        </h2>
        {d.packages.length === 0 ? (
          <p className="rounded-3xl bg-white p-6 text-sm text-navy-soft">{t("noPacks")}</p>
        ) : (
          <ul className="grid gap-3.5 sm:grid-cols-2">
            {d.packages.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-3xl bg-white p-6">
                <div className="flex items-center gap-3">
                  <TeacherAvatar teacher={p.teacher} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t("packWith", { count: p.lessonCount, name: fullName(p.teacher) })}</p>
                    <p className="text-[13px] text-muted">{t("boughtOn", { date: f.date(p.createdAt), amount: f.money(p.totalCents) })}</p>
                  </div>
                  <Badge tone={packageTone[p.status]}>{t(`packStatus.${p.status}`)}</Badge>
                </div>
                <div
                  className="h-2 rounded-md bg-line-soft"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={p.lessonCount}
                  aria-valuenow={p.lessonsUsed}
                  aria-label={t("usedAria", { used: p.lessonsUsed, total: p.lessonCount })}
                >
                  <div className="h-2 rounded-md bg-teal-dark" style={{ width: `${Math.min(100, (p.lessonsUsed / p.lessonCount) * 100)}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-navy-soft">{t("remaining", { count: p.remaining })}</span>
                  {p.status === "active" && p.remaining > 0 && (
                    <ButtonLink href={`/teachers/${p.teacher.slug}?type=package#book`} size="sm" variant="teal">
                      {t("bookFromPack")}
                    </ButtonLink>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3.5" aria-labelledby="history-title">
        <h2 id="history-title" className="text-[19px] font-bold">
          {t("historyTitle")}
        </h2>
        {d.payments.length === 0 ? (
          <EmptyState icon="wallet" title={t("emptyTitle")} text={t("emptyText")} />
        ) : (
          <div className="rounded-3xl bg-white p-2 sm:p-4">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("historyTitle")}</caption>
              <thead className="text-start text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t("colDate")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t("colWhat")}
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-start font-semibold sm:table-cell">
                    {t("colStatus")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-end font-semibold">
                    {t("colAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.payments.map((p) => (
                  <PaymentRowView key={p.id} p={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">{t("note")}</p>
      </section>
    </>
  );
}

function PaymentRowView({ p }: { p: PaymentRow }) {
  const t = useTranslations("student.payments");
  const f = useFormat();
  const teacher = p.teacher ? fullName(p.teacher) : "—";
  const what = "lessonCount" in p.what ? t("what.package", { count: p.what.lessonCount, name: teacher }) : t(`what.${p.what.kind === "trial" ? "trial" : "single"}`, { name: teacher });
  const lessonDate = "lessonDate" in p.what ? p.what.lessonDate : null;
  return (
    <tr className="border-t border-line-soft align-top">
      <td className="px-3 py-3 whitespace-nowrap">{f.date(p.createdAt)}</td>
      <td className="px-3 py-3">
        <span className="block">{what}</span>
        {lessonDate && <span className="block text-xs text-muted">{t("lessonOn", { date: f.date(lessonDate) })}</span>}
        <Badge tone={paymentTone[p.status]} className="mt-1 sm:hidden">
          {t(`status.${p.status}`)}
        </Badge>
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <Badge tone={paymentTone[p.status]}>{t(`status.${p.status}`)}</Badge>
      </td>
      <td className="px-3 py-3 text-end whitespace-nowrap">
        <span className="font-semibold">{f.money(p.amountCents)}</span>
        {p.refundedCents > 0 && <span className="block text-xs text-muted">{t("refunded", { amount: f.money(p.refundedCents) })}</span>}
      </td>
    </tr>
  );
}
