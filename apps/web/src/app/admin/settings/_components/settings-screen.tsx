"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { sampleAudit, sampleSettings } from "../../_components/live/samples";
import type { AuditEntry, Page, PlatformSettings } from "../../_components/live/types";
import { LoadGate, PageShell, Pagination, SearchBox, StaleError, control, panel, td, th, useDebounced, useFormat } from "../../_components/live/ui";
import { useAdminData } from "../../_components/live/use-admin-data";

const ENTITIES = ["", "booking", "teacher", "user"] as const;

export function SettingsScreen() {
  const t = useTranslations("admin.settingsPage");
  const settings = useAdminData<PlatformSettings>("/admin/settings", sampleSettings);
  return (
    <PageShell title={t("title")} subtitle={t("subtitle")}>
      <LoadGate data={settings.data} error={settings.error} retrying={settings.retrying} reload={settings.reload} what={t("what")}>
        {(s) => <Rules s={s} />}
      </LoadGate>
      <AuditLog />
    </PageShell>
  );
}

function Rules({ s }: { s: PlatformSettings }) {
  const t = useTranslations("admin.settingsPage");
  const fmt = useFormat();
  const pct = (n: number) => fmt.percent(n);
  const groups: { id: "pricing" | "policies" | "payouts"; rows: { label: string; value: string; hint?: string }[] }[] = [
    {
      id: "pricing",
      rows: [
        { label: t("rules.commission"), value: pct(s.commissionRate), hint: t("rules.commissionHint") },
        {
          label: t("rules.priceRange"),
          value: t("rules.priceRangeValue", { min: fmt.money(s.priceRangeCents.min), max: fmt.money(s.priceRangeCents.max), minutes: s.lessonMinutes }),
        },
        ...s.packDiscounts.map((p) => ({ label: t("rules.pack", { count: p.lessons }), value: t("rules.discount", { percent: p.discountPct }) })),
        { label: t("rules.trial"), value: t("rules.minutes", { count: s.trialMinutes }), hint: t("rules.trialHint") },
      ],
    },
    {
      id: "policies",
      rows: [
        { label: t("rules.cancellation"), value: t("rules.hours", { count: s.freeCancellationHours }), hint: t("rules.cancellationHint") },
        { label: t("rules.refundWindow"), value: t("rules.hours", { count: s.refundWindowHours }), hint: t("rules.refundWindowHint") },
        { label: t("rules.paymentHold"), value: t("rules.minutes", { count: s.paymentHoldMinutes }) },
        { label: t("rules.minAge"), value: t("rules.years", { count: s.minStudentAge }) },
        { label: t("rules.teacherWarning"), value: t("rules.teacherWarningValue", { count: s.teacherWarning.cancellations, days: s.teacherWarning.windowDays }) },
      ],
    },
    {
      id: "payouts",
      rows: [
        { label: t("rules.payoutDay"), value: t("rules.payoutDayValue", { day: s.payoutDay }), hint: t("rules.nextPayout", { date: fmt.date(s.nextPayoutDate) }) },
        { label: t("rules.minWithdrawal"), value: fmt.money(s.minWithdrawalCents) },
        { label: t("rules.earningsHold"), value: t("rules.hours", { count: s.refundWindowHours }), hint: t("rules.earningsHoldHint") },
      ],
    },
  ];
  return (
    <>
      <p className="text-[13px] text-muted">{t("readOnly")}</p>
      <div className="grid gap-[18px] lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`rules-${g.id}`} className={panel}>
            <h2 id={`rules-${g.id}`} className="text-base font-bold">
              {t(`groups.${g.id}`)}
            </h2>
            <dl className="flex flex-col">
              {g.rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-0.5 border-b border-beige-2 py-2.5 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-navy-soft">{r.label}</dt>
                    <dd className="text-end text-sm font-semibold">{r.value}</dd>
                  </div>
                  {r.hint && <p className="text-xs text-muted">{r.hint}</p>}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}

function AuditLog() {
  const t = useTranslations("admin.settingsPage.audit");
  const ta = useTranslations("admin.settingsPage.audit.actions");
  const tr = useTranslations("common.roles");
  const fmt = useFormat();
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState<(typeof ENTITIES)[number]>("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const path = useMemo(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (entity) p.set("entity", entity);
    if (q) p.set("search", q);
    return `/admin/audit-logs?${p}`;
  }, [page, entity, q]);
  const sample = useMemo<Page<AuditEntry>>(() => {
    const items = sampleAudit.items.filter((a) => !entity || a.entity === entity);
    return { ...sampleAudit, items, total: items.length };
  }, [entity]);
  const { data, error, retrying, reload } = useAdminData<Page<AuditEntry>>(path, sample);
  const action = (a: string) => (ta.has(a.replace(".", "_") as never) ? ta(a.replace(".", "_") as never) : a);

  return (
    <section aria-labelledby="audit-h" className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="audit-h" className="text-base font-bold">
            {t("title")}
          </h2>
          <p className="text-[13px] text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchBox value={search} onChange={(v) => (setSearch(v), setPage(1))} label={t("search")} placeholder={t("searchPlaceholder")} className="sm:w-[240px]" />
          <label>
            <span className="sr-only">{t("entity")}</span>
            <select value={entity} onChange={(e) => (setEntity(e.target.value as (typeof ENTITIES)[number]), setPage(1))} className={control}>
              {ENTITIES.map((e) => (
                <option key={e || "all"} value={e}>
                  {t(`entities.${e || "all"}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {(d) => (
          <>
            <StaleError error={error} reload={reload} retrying={retrying} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <caption className="sr-only">{t("title")}</caption>
                <thead>
                  <tr>
                    <th scope="col" className={th}>
                      {t("when")}
                    </th>
                    <th scope="col" className={th}>
                      {t("actor")}
                    </th>
                    <th scope="col" className={th}>
                      {t("action")}
                    </th>
                    <th scope="col" className={th}>
                      {t("target")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className={cn(td, "text-center text-muted")}>
                        {t("empty")}
                      </td>
                    </tr>
                  )}
                  {d.items.map((a) => (
                    <tr key={a.id}>
                      <td className={td}>{fmt.dateTime(a.createdAt)}</td>
                      <td className={td}>
                        {a.actor ? (
                          <span className="flex flex-col">
                            <span className="font-semibold">{a.actor.name ?? "—"}</span>
                            <span className="text-[13px] text-muted">{tr(a.actor.role)}</span>
                          </span>
                        ) : (
                          <span className="text-muted">{t("system")}</span>
                        )}
                      </td>
                      <td className={td}>{action(a.action)}</td>
                      <td className={td}>
                        <span className="text-muted">{t.has(`entities.${a.entity}` as never) ? t(`entities.${a.entity}` as never) : a.entity}</span>{" "}
                        {a.entityId && <span className="font-mono text-[13px]">{a.entityId.slice(0, 8)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onPage={setPage} label={t("pagination")} />
          </>
        )}
      </LoadGate>
    </section>
  );
}
