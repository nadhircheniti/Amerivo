"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { useApi } from "@/lib/use-api";
import type { ModerationContextView, ModerationFlag, ModerationList, ModerationStatus } from "../_components/live/types";
import { Confirm, LoadGate, Notice, PageShell, Pagination, PillTabs, StaleError, fullName, panel, useFormat } from "../_components/live/ui";
import { errorText, isLive, useAdminData } from "../_components/live/use-admin-data";

const TABS: ModerationStatus[] = ["open", "warned", "blocked", "dismissed"];
const STATUS_TONE: Record<ModerationStatus, BadgeTone> = { open: "warning", warned: "orange", blocked: "danger", dismissed: "neutral" };
const TYPES = ["email", "phone", "link", "handle", "app"] as const;
const TYPE_TONE: Record<(typeof TYPES)[number], BadgeTone> = { email: "danger", phone: "danger", link: "danger", handle: "danger", app: "info" };
const knownType = (s: string): s is (typeof TYPES)[number] => (TYPES as readonly string[]).includes(s);

const sample: ModerationList = {
  items: [
    {
      id: "flag-1",
      context: "message",
      types: ["app", "phone"],
      originalText: "Text me on WhatsApp +1 512 555 0147, it's easier",
      deliveredText: "Text me on WhatsApp [hidden], it's easier",
      status: "open",
      reviewNote: null,
      reviewedAt: null,
      bookingId: null,
      conversationId: "conv-1",
      createdAt: "2026-10-06T14:12:00Z",
      sender: { id: "s1", firstName: "Maria", lastName: "Silva", role: "student", email: "maria@example.com", status: "active" },
      recipient: { id: "t1", firstName: "Sarah", lastName: "Mitchell", role: "teacher" },
      senderFlags30d: 2,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
};

export function ModerationScreen() {
  const t = useTranslations("admin.moderationPage");
  const [tab, setTab] = useState<ModerationStatus>("open");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const demo = useMemo<ModerationList>(() => {
    const items = sample.items.filter((f) => f.status === tab);
    return { ...sample, items, total: items.length };
  }, [tab]);
  const { data, error, retrying, reload } = useAdminData<ModerationList>(`/admin/moderation?${new URLSearchParams({ status: tab, page: String(page) })}`, demo);

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
                {list.items.map((f) => (
                  <li key={f.id}>
                    <FlagCard
                      flag={f}
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

type Action = "dismiss" | "warn" | "block";

function FlagCard({ flag: f, onChanged }: { flag: ModerationFlag; onChanged: (notice: string) => void }) {
  const t = useTranslations("admin.moderationPage");
  const tl = useTranslations("admin.live");
  const fmt = useFormat();
  const { call } = useApi();
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [context, setContext] = useState<ModerationContextView | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const sender = fullName(f.sender);

  const act = async (action: Action, note: string) => {
    if (!isLive) throw new Error(tl("demoAction"));
    await call(`/admin/moderation/${f.id}/review`, { method: "POST", body: JSON.stringify({ action, ...(note ? { note } : {}) }) });
    setConfirm(null);
    onChanged(t(`notice.${action}`, { name: sender }));
  };

  const showContext = async () => {
    setContextError(null);
    if (!isLive) return setContext({ kind: "conversation", messages: [{ id: "m1", senderId: f.sender.id, body: f.deliveredText, createdAt: f.createdAt }] });
    try {
      setContext(await call<ModerationContextView>(`/admin/moderation/${f.id}/context`));
    } catch (e) {
      setContextError(errorText(e, tl("actionError")));
    }
  };

  const nameOf = (id: string) => (id === f.sender.id ? sender : f.recipient && id === f.recipient.id ? fullName(f.recipient) : "—");

  return (
    <article className="flex flex-col gap-2.5 rounded-[14px] bg-cream p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <strong>{sender}</strong> <span className="text-muted">({t(`roles.${f.sender.role}`)})</span>
          {f.sender.email && (
            <>
              {" · "}
              <span dir="ltr" className="text-navy-soft">
                {f.sender.email}
              </span>
            </>
          )}
          {f.recipient && (
            <>
              {" → "}
              <strong>{fullName(f.recipient)}</strong> <span className="text-muted">({t(`roles.${f.recipient.role}`)})</span>
            </>
          )}
        </p>
        <span className="flex items-center gap-2 text-xs text-muted">
          {fmt.dateTime(f.createdAt)}
          <Badge tone={STATUS_TONE[f.status]}>{t(`status.${f.status}`)}</Badge>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge tone="neutral">{t(`contexts.${f.context}`)}</Badge>
        {f.types.filter(knownType).map((type) => (
          <Badge key={type} tone={TYPE_TONE[type]}>
            {t(`types.${type}`)}
          </Badge>
        ))}
        {f.senderFlags30d > 1 && <Badge tone="danger">{t("repeat", { count: f.senderFlags30d })}</Badge>}
        {f.sender.status === "blocked" && <Badge tone="danger">{t("accountBlocked")}</Badge>}
      </div>
      <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3">
          <dt className="mb-1 font-semibold text-muted">{t("original")}</dt>
          <dd dir="auto" className="break-words whitespace-pre-line text-navy">
            {f.originalText}
          </dd>
        </div>
        <div className="rounded-xl bg-white p-3">
          <dt className="mb-1 font-semibold text-muted">{t("delivered")}</dt>
          <dd dir="auto" className="break-words whitespace-pre-line text-navy">
            {f.deliveredText ?? t("notDelivered")}
          </dd>
        </div>
      </dl>
      {f.reviewNote && <p className="text-[13px] text-navy-soft">{t("reviewNote", { note: f.reviewNote })}</p>}

      {context && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-white p-3">
          <p className="text-xs font-semibold text-muted">{t(context.kind === "none" ? "contextNone" : "contextTitle")}</p>
          <ol className="flex flex-col gap-1.5">
            {context.messages.map((m) => (
              <li key={m.id} className="text-[13px]">
                <span className="text-xs text-muted">
                  {fmt.dateTime(m.createdAt)} · {nameOf(m.senderId)}
                </span>
                <p dir="auto" className="break-words whitespace-pre-line text-navy">
                  {m.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {contextError && (
        <p role="alert" className="text-[13px] text-danger-text">
          {contextError}
        </p>
      )}

      {confirm ? (
        <Confirm
          question={t(`confirm.${confirm}`, { name: sender })}
          confirmLabel={t(`actions.${confirm}`)}
          tone={confirm === "block" ? "danger" : "teal"}
          note={confirm === "dismiss" ? undefined : { label: confirm === "warn" ? t("warnNoteLabel") : t("blockNoteLabel"), placeholder: t("notePlaceholder") }}
          onConfirm={(note) => act(confirm, note)}
          onCancel={() => setConfirm(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {(f.context === "message" || f.context === "lesson_chat") && !context && (
            <Button variant="outline" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => void showContext()}>
              {t("showContext")}
            </Button>
          )}
          {f.status === "open" && (
            <>
              <Button variant="outline" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setConfirm("dismiss")}>
                {t("actions.dismiss")}
              </Button>
              <Button variant="teal" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setConfirm("warn")}>
                {t("actions.warn")}
              </Button>
            </>
          )}
          {f.status !== "blocked" && f.sender.role !== "admin" && f.sender.status !== "blocked" && (
            <Button variant="dangerOutline" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setConfirm("block")}>
              {t("actions.block")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
