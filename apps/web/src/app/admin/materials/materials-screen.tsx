"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFiles } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/primitives";
import { STATUS_TONE, fileSize, type Material, type MaterialPage, type MaterialStatus } from "@/components/materials/types";
import { intlTags } from "@/i18n/config";
import { useApi } from "@/lib/use-api";
import { Confirm, LoadGate, Notice, PageShell, Pagination, PillTabs, StaleError, fullName, panel, useFormat } from "../_components/live/ui";
import { errorText, isLive, useAdminData } from "../_components/live/use-admin-data";

const TABS: MaterialStatus[] = ["pending", "approved", "rejected"];

const sample: MaterialPage = {
  items: [
    {
      id: "mat-1",
      title: "Business e-mails — useful phrases",
      description: "Openings, requests and polite endings, with exercises.",
      status: "pending",
      reviewNote: null,
      reviewedAt: null,
      createdAt: "2026-10-06T09:30:00Z",
      fileName: "business-emails.pdf",
      contentType: "application/pdf",
      sizeBytes: 482_000,
      fileUrl: "/api/files/sample",
      teacher: { id: "t1", firstName: "Sarah", lastName: "Mitchell", email: "sarah@example.com" },
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
};

export function MaterialsScreen() {
  const t = useTranslations("admin.materialsPage");
  const [tab, setTab] = useState<MaterialStatus>("pending");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const demo = useMemo<MaterialPage>(() => {
    const items = sample.items.filter((m) => m.status === tab);
    return { ...sample, items, total: items.length };
  }, [tab]);
  const { data, error, retrying, reload } = useAdminData<MaterialPage>(`/admin/materials?${new URLSearchParams({ status: tab, page: String(page) })}`, demo);

  return (
    <PageShell title={t("title")} subtitle={t("subtitle")}>
      <PillTabs
        label={t("statusTabs")}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        tabs={TABS.map((id) => ({ id, label: t(`tabs.${id}`) }))}
      />
      <Notice text={notice} />
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {(list) => (
          <section className={panel} aria-label={t(`tabs.${tab}`)}>
            <StaleError error={error} reload={reload} retrying={retrying} />
            {list.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t(`empty.${tab}`)}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {list.items.map((m) => (
                  <li key={m.id}>
                    <MaterialCard
                      item={m}
                      onChanged={(n) => {
                        setNotice(n);
                        reload();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={setPage} label={t("pagination")} />
          </section>
        )}
      </LoadGate>
    </PageShell>
  );
}

function MaterialCard({ item: m, onChanged }: { item: Material; onChanged: (notice: string) => void }) {
  const t = useTranslations("admin.materialsPage");
  const tl = useTranslations("admin.live");
  const fmt = useFormat();
  const { call } = useApi();
  const { open } = useFiles();
  const [confirm, setConfirm] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const teacher = m.teacher ? fullName(m.teacher) : "—";

  const decide = async (decision: "approved" | "rejected", note: string) => {
    if (!isLive) throw new Error(tl("demoAction"));
    await call(`/admin/materials/${m.id}/review`, { method: "POST", body: JSON.stringify({ decision, ...(note ? { note } : {}) }) });
    setConfirm(null);
    onChanged(t(decision === "approved" ? "noticeApproved" : "noticeRejected", { title: m.title }));
  };

  return (
    <article className="flex flex-col gap-2 rounded-[14px] bg-cream p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <strong className="break-words">{m.title}</strong> · <span className="text-navy-soft">{teacher}</span>
          {m.teacher?.email && (
            <span dir="ltr" className="text-muted">
              {" "}
              ({m.teacher.email})
            </span>
          )}
        </p>
        <span className="flex items-center gap-2 text-xs text-muted">
          {fmt.dateTime(m.createdAt)}
          <Badge tone={STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge>
        </span>
      </div>
      {m.description && <p className="text-[13px] break-words whitespace-pre-line text-navy">{m.description}</p>}
      <p className="text-xs text-muted">
        {m.fileName} · {fileSize(m.sizeBytes, intlTags[fmt.locale])}
      </p>
      {m.reviewNote && <p className="text-[13px] text-navy-soft">{t("reviewNote", { note: m.reviewNote })}</p>}
      {error && (
        <p role="alert" className="text-[13px] text-danger-text">
          {error}
        </p>
      )}
      {confirm ? (
        <Confirm
          question={t(confirm === "approved" ? "confirmApprove" : "confirmReject", { title: m.title })}
          confirmLabel={t(confirm === "approved" ? "approve" : "reject")}
          tone={confirm === "rejected" ? "danger" : "teal"}
          note={confirm === "rejected" ? { label: t("rejectReason"), placeholder: t("rejectPlaceholder"), required: true } : undefined}
          onConfirm={(note) => decide(confirm, note)}
          onCancel={() => setConfirm(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-[38px] px-3.5 text-[13px]"
            onClick={() => {
              setError(null);
              if (!isLive) return setError(tl("demoAction"));
              void open(m.fileUrl).catch((e) => setError(errorText(e, tl("actionError"))));
            }}
          >
            {t("open")}
          </Button>
          {m.status !== "approved" && (
            <Button variant="teal" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setConfirm("approved")}>
              {t("approve")}
            </Button>
          )}
          {m.status !== "rejected" && (
            <Button variant="dangerOutline" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setConfirm("rejected")}>
              {t("reject")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
