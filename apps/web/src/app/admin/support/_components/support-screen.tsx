"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { useApi } from "@/lib/use-api";
import { CONTACT_EMAIL } from "@/lib/contact";
import { sampleSupport } from "../../_components/live/samples";
import type { SupportDetail, SupportList, SupportListItem, SupportStatus } from "../../_components/live/types";
import { LoadGate, Notice, PageShell, Pagination, PillTabs, SearchBox, StaleError, linkAction, panel, useDebounced, useFormat } from "../../_components/live/ui";
import { errorText, isLive, useAdminData } from "../../_components/live/use-admin-data";

const TABS: SupportStatus[] = ["open", "answered", "closed"];
/** E-mails to customers are written in English (the platform's working language). */
const MAIL_SUBJECT = "Re: your message to Amerivo English";
const STATUS_TONE: Record<SupportStatus, BadgeTone> = { open: "warning", answered: "success", closed: "neutral" };

export function SupportScreen() {
  const t = useTranslations("admin.supportPage");
  const [tab, setTab] = useState<SupportStatus>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const q = useDebounced(search.trim());
  const sample = useMemo<SupportList>(() => {
    const items = sampleSupport.items.filter((m) => m.status === tab);
    return { ...sampleSupport, items, total: items.length };
  }, [tab]);
  const params = new URLSearchParams({ status: tab, page: String(page), ...(q ? { search: q } : {}) });
  const { data, error, retrying, reload } = useAdminData<SupportList>(`/admin/support?${params}`, sample);

  return (
    <PageShell
      title={t("title")}
      subtitle={t("subtitle", { email: CONTACT_EMAIL })}
      actions={
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          label={t("search")}
          placeholder={t("searchPlaceholder")}
        />
      }
    >
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
              <p className="py-6 text-center text-sm text-muted">{q ? t("emptySearch") : t(`empty.${tab}`)}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {list.items.map((m) => (
                  <li key={m.id}>
                    <SupportCard
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

function SupportCard({ item: m, onChanged }: { item: SupportListItem; onChanged: (notice: string) => void }) {
  const t = useTranslations("admin.supportPage");
  const fmt = useFormat();
  const [open, setOpen] = useState(false);
  const who = m.role ? t(`roles.${m.role}`) : t("roles.none");

  return (
    <article className="flex flex-col gap-2 rounded-[14px] bg-cream p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <strong>{m.name}</strong> ·{" "}
          <a href={`mailto:${m.email}`} className="text-teal-dark hover:text-navy" dir="ltr">
            {m.email}
          </a>{" "}
          · <span className="text-muted">{who}</span>
        </p>
        <span className="flex items-center gap-2 text-xs text-muted">
          {fmt.dateTime(m.createdAt)}
          <Badge tone={STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge>
        </span>
      </div>
      <p className="text-[13px] font-semibold text-navy-soft">
        {t(`topics.${m.topic}`)}
        {m.replies > 0 && <span className="font-normal text-muted"> · {t("repliesCount", { count: m.replies })}</span>}
      </p>
      <p className={`text-[13px] break-words whitespace-pre-line text-navy ${open ? "" : "line-clamp-2"}`}>{m.message}</p>
      {open ? (
        <Thread id={m.id} item={m} onChanged={onChanged} onClose={() => setOpen(false)} />
      ) : (
        <div>
          <Button variant="teal" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={() => setOpen(true)}>
            {m.status === "open" ? t("answer") : t("view")}
          </Button>
        </div>
      )}
    </article>
  );
}

/** Full conversation + reply box. */
function Thread({ id, item, onChanged, onClose }: { id: string; item: SupportListItem; onChanged: (notice: string) => void; onClose: () => void }) {
  const t = useTranslations("admin.supportPage");
  const tl = useTranslations("admin.live");
  const fmt = useFormat();
  const { call, isLoaded, isSignedIn } = useApi();
  const [detail, setDetail] = useState<SupportDetail | null>(isLive ? null : { ...item, replies: [], emailEnabled: false, supportEmail: CONTACT_EMAIL });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!isLive || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<SupportDetail>(`/admin/support/${id}`)
      .then((d) => !cancelled && setDetail(d))
      .catch((e: unknown) => !cancelled && setLoadError(errorText(e, tl("actionError"))));
    return () => {
      cancelled = true;
    };
  }, [call, id, isLoaded, isSignedIn, nonce, tl]);

  const mailto = (body: string) =>
    `mailto:${item.email}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(`${body}\n\n----- Your message -----\n${item.message}`)}`;

  const send = async () => {
    const body = text.trim();
    if (body.length < 2) return setError(t("replyRequired"));
    if (!isLive) return setError(tl("demoAction"));
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ emailed: boolean; emailError: string | null }>(`/admin/support/${id}/reply`, { method: "POST", body: JSON.stringify({ body }) });
      setText("");
      setNonce((n) => n + 1);
      if (!r.emailed) window.open(mailto(body), "_self"); // e-mail not configured or failed: finish in the mail app
      onChanged(r.emailed ? t("noticeEmailed", { email: item.email }) : t("noticeSaved", { email: item.email }));
    } catch (e) {
      setError(errorText(e, tl("actionError")));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: SupportStatus) => {
    if (!isLive) return setError(tl("demoAction"));
    try {
      await call(`/admin/support/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      onChanged(status === "closed" ? t("noticeClosed", { name: item.name }) : t("noticeReopened", { name: item.name }));
    } catch (e) {
      setError(errorText(e, tl("actionError")));
    }
  };

  if (loadError) return <p className="text-[13px] text-danger-text">{loadError}</p>;
  if (!detail) return <p className="text-[13px] text-muted">{t("loading")}</p>;

  return (
    <div className="mt-1 flex flex-col gap-3 border-t border-line-soft pt-3">
      {detail.replies.length > 0 && (
        <ol className="flex flex-col gap-2" aria-label={t("repliesLabel")}>
          {detail.replies.map((r) => (
            <li key={r.id} className="rounded-xl bg-white p-3">
              <p className="text-xs text-muted">
                {t("replyBy", { name: r.author ?? "—", date: fmt.dateTime(r.createdAt) })} · {r.emailed ? t("emailedYes") : t("emailedNo")}
              </p>
              <p className="mt-1 text-[13px] break-words whitespace-pre-line text-navy">{r.body}</p>
            </li>
          ))}
        </ol>
      )}

      {!detail.emailEnabled && <p className="rounded-xl bg-white px-3 py-2 text-xs text-orange-text">{t("emailOff", { email: detail.supportEmail })}</p>}

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        {t("replyLabel", { name: item.name })}
        <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("replyPlaceholder")} maxLength={10000} />
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-danger-text">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="teal" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={send} disabled={busy}>
          {busy ? t("sending") : detail.emailEnabled ? t("sendReply") : t("saveAndOpenMail")}
        </Button>
        <a href={mailto(text)} className="inline-flex h-[38px] items-center rounded-full border border-line bg-white px-3.5 text-[13px] text-navy hover:bg-beige">
          {t("openMail")}
        </a>
        {item.status === "closed" ? (
          <button type="button" className={`${linkAction} text-[13px]`} onClick={() => setStatus("open")}>
            {t("reopen")}
          </button>
        ) : (
          <button type="button" className={`${linkAction} text-[13px]`} onClick={() => setStatus("closed")}>
            {t("close")}
          </button>
        )}
        <button type="button" className="ms-auto text-[13px] text-muted hover:text-navy" onClick={onClose}>
          {t("collapse")}
        </button>
      </div>
    </div>
  );
}
