"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DisputeCard } from "../../_components/live/disputes";
import { sampleDisputes } from "../../_components/live/samples";
import type { AdminDispute, DisputeStatus } from "../../_components/live/types";
import { LoadGate, Notice, PageShell, PillTabs, SearchBox, StaleError, fullName, panel } from "../../_components/live/ui";
import { useAdminData } from "../../_components/live/use-admin-data";

const TABS: DisputeStatus[] = ["open", "refunded", "rejected"];

export function DisputesScreen() {
  const t = useTranslations("admin.disputesPage");
  const [tab, setTab] = useState<DisputeStatus>("open");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const sample = useMemo(() => sampleDisputes.filter((d) => d.status === tab), [tab]);
  const { data, error, retrying, reload } = useAdminData<AdminDispute[]>(`/admin/disputes?status=${tab}`, sample);
  const q = search.trim().toLowerCase();
  const visible = (data ?? []).filter((d) => !q || `${fullName(d.student)} ${fullName(d.teacher)} ${d.student.email} ${d.reason}`.toLowerCase().includes(q));

  return (
    <PageShell title={t("title")} subtitle={t("subtitle")} actions={<SearchBox value={search} onChange={setSearch} label={t("search")} placeholder={t("searchPlaceholder")} />}>
      <PillTabs label={t("statusTabs")} value={tab} onChange={setTab} tabs={TABS.map((id) => ({ id, label: t(`tabs.${id}`) }))} />
      <Notice text={notice} />
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {() => (
          <section className={panel} aria-label={t(`tabs.${tab}`)}>
            <StaleError error={error} reload={reload} retrying={retrying} />
            {tab === "open" && <p className="text-[13px] text-muted">{t("openHint")}</p>}
            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{q ? t("emptySearch") : t(`empty.${tab}`)}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((d) => (
                  <li key={d.id}>
                    <DisputeCard
                      dispute={d}
                      onResolved={(n) => {
                        setNotice(n);
                        reload();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </LoadGate>
    </PageShell>
  );
}
