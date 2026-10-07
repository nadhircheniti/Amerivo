"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { intlTags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { fullName, PersonAvatar } from "./person-avatar";
import type { ApiConversation, ApiMessage, ChatRole, MessagingSource } from "./types";
import { usePolling } from "./use-polling";

const THREAD_POLL_MS = 10_000;
const LIST_POLL_MS = 30_000;
const MAX_LENGTH = 4000;

/** A message on screen: from the server, or still being sent / failed (optimistic send). */
type LocalMessage = ApiMessage & { status?: "sending" | "failed" };
type Thread = { items: LocalMessage[]; hasMore: boolean; state: "loading" | "ok" | "error"; loadingEarlier?: boolean };

const byTime = (a: ApiMessage, b: ApiMessage) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
const lastActivity = (c: ApiConversation) => c.lastMessageAt ?? c.lastMessage?.createdAt ?? "";
const sortConversations = (list: ApiConversation[]) => [...list].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));

/** Server messages (deduplicated, in order) followed by the ones still pending locally. */
function merge(current: LocalMessage[], incoming: ApiMessage[]): LocalMessage[] {
  const map = new Map<string, LocalMessage>();
  for (const m of current) if (!m.status) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...[...map.values()].sort(byTime), ...current.filter((m) => m.status)];
}

function useDates() {
  const t = useTranslations("messaging.view");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  return useMemo(() => {
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const time = (iso: string) => new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
    const daysAgo = (d: Date) => {
      const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const now = new Date();
      const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return Math.round((b.getTime() - a.getTime()) / 86_400_000);
    };
    return {
      dayKey,
      time,
      /** Conversation list: time today, weekday this week, else a short date. */
      short(iso: string) {
        const d = new Date(iso);
        const ago = daysAgo(d);
        if (ago === 0) return time(iso);
        if (ago > 0 && ago < 7) return new Intl.DateTimeFormat(tag, { weekday: "short" }).format(d);
        return new Intl.DateTimeFormat(tag, { month: "short", day: "numeric" }).format(d);
      },
      /** Day separator in the thread. */
      day(iso: string) {
        const d = new Date(iso);
        const ago = daysAgo(d);
        if (ago === 0) return t("today");
        if (ago === 1) return t("yesterday");
        return new Intl.DateTimeFormat(tag, { weekday: "long", month: "long", day: "numeric", year: ago > 300 ? "numeric" : undefined }).format(d);
      },
      full: (iso: string) => new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)),
    };
  }, [t, tag]);
}

function Bubble({ m, mine, name, onRetry }: { m: LocalMessage; mine: boolean; name: string; onRetry: () => void }) {
  const t = useTranslations("messaging.view");
  const dates = useDates();
  const text = m.kind === "text" ? (m.body ?? "") : m.body || m.attachmentName || (m.kind === "homework" ? t("homework") : t("attachment"));
  return (
    <div className={cn("flex max-w-[520px] flex-col gap-1", mine ? "items-end self-end" : "items-start self-start")}>
      <p
        className={cn(
          "px-[18px] py-3.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap",
          "rounded-[18px]",
          mine ? "rounded-ee-[4px] bg-navy text-white" : "rounded-es-[4px] bg-white",
          m.status === "sending" && "opacity-70",
          m.status === "failed" && "ring-2 ring-orange-dark",
        )}
      >
        <span className="sr-only">{mine ? t("youSr") : `${name}: `}</span>
        {m.kind !== "text" && <Icon name={m.kind === "homework" ? "book" : "file"} size={16} className="me-1.5 inline-block align-[-2px]" />}
        {/* The message keeps its own writing direction (e.g. English text in the Arabic interface). */}
        <bdi dir="auto">{text}</bdi>
      </p>
      <span className="px-1 text-xs text-muted">
        {m.status === "sending" ? (
          t("sending")
        ) : m.status === "failed" ? (
          <span className="text-orange-dark">
            {t("failed")}{" "}
            <button type="button" onClick={onRetry} className="font-semibold text-teal-dark underline hover:text-navy">
              {t("retry")}
            </button>
          </span>
        ) : (
          <time dateTime={m.createdAt} title={dates.full(m.createdAt)}>
            {dates.time(m.createdAt)}
          </time>
        )}
      </span>
    </div>
  );
}

function InfoPanel({ c, role }: { c: ApiConversation; role: ChatRole }) {
  const t = useTranslations("messaging.view");
  const slug = c.other.teacherSlug;
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-s border-sand bg-white px-6 py-7 xl:flex" aria-label={t("details")}>
      <div className="flex flex-col items-center gap-2.5 text-center">
        <PersonAvatar person={c.other} size={88} />
        <h2 className="text-lg font-bold">{fullName(c.other)}</h2>
        <p className="text-sm text-muted">{c.other.role === "teacher" ? t("roleTeacher") : t("roleStudent")}</p>
        {role === "student" && slug && (
          <Link href={`/teachers/${slug}`} className="text-sm font-semibold text-teal-dark hover:text-navy">
            {t("viewProfile")}
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-line-soft pt-[18px]">
        {role === "student" && slug ? (
          <ButtonLink href={`/teachers/${slug}`} variant="teal" size="sm">
            {t("bookLesson")}
          </ButtonLink>
        ) : role === "teacher" ? (
          <ButtonLink href="/teacher/students" variant="outline" size="sm">
            {t("myStudents")}
          </ButtonLink>
        ) : null}
      </div>
    </aside>
  );
}

/**
 * Conversation list + thread + composer, shared by the student and teacher spaces.
 * Polls the open thread every 10 s and the list every 30 s; sends optimistically.
 * `deepLink` (from ?with= / ?student=) opens or creates that conversation.
 */
export function ConversationsView({
  role,
  source,
  deepLink,
  demo = false,
}: {
  role: ChatRole;
  source: MessagingSource;
  deepLink?: { teacherSlug: string } | { studentId: string } | null;
  demo?: boolean;
}) {
  const t = useTranslations("messaging.view");
  const dates = useDates();
  const [convs, setConvs] = useState<ApiConversation[] | null>(null);
  const [listError, setListError] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  /** Shown after a message in which the API hid contact details. */
  const [contactHidden, setContactHidden] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "thread">(deepLink ? "thread" : "list");
  const scrollRef = useRef<HTMLDivElement>(null);
  const keepScroll = useRef<number | null>(null);
  const localSeq = useRef(0);

  const active = convs?.find((c) => c.id === activeId) ?? null;
  const thread = activeId ? threads[activeId] : undefined;

  /* ---------------- conversation list */
  const loadList = useCallback(
    () =>
      source.list().then(
        (list) => {
          setListError(false);
          setConvs(sortConversations(list));
          return list;
        },
        () => {
          setListError(true);
          return null;
        },
      ),
    [source],
  );

  // First load (+ deep link), then pick the most recent conversation on wide screens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let target: string | null = null;
      if (deepLink) {
        try {
          target = (await source.start(deepLink)).id;
        } catch {
          if (!cancelled) setOpenError(true);
        }
      }
      const list = await loadList();
      if (cancelled || !list) return;
      setActiveId((cur) => cur ?? target ?? sortConversations(list)[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
    // The deep link is read once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, loadList]);

  usePolling(() => void loadList(), LIST_POLL_MS, convs !== null);

  /* ---------------- thread */
  const loadLatest = useCallback(
    (id: string) =>
      source.page(id).then(
        (page) => {
          setThreads((all) => {
            const cur = all[id];
            return { ...all, [id]: { items: merge(cur?.items ?? [], page.items), hasMore: cur?.state === "ok" ? cur.hasMore : page.hasMore, state: "ok" } };
          });
          const last = page.items[page.items.length - 1];
          setConvs((list) =>
            list
              ? sortConversations(
                  list.map((c) =>
                    c.id === id
                      ? {
                          ...c,
                          unreadCount: 0,
                          ...(last && last.createdAt >= lastActivity(c) ? { lastMessage: { body: last.body, kind: last.kind, senderId: last.senderId, createdAt: last.createdAt }, lastMessageAt: last.createdAt } : {}),
                        }
                      : c,
                  ),
                )
              : list,
          );
        },
        () => setThreads((all) => (all[id]?.state === "ok" ? all : { ...all, [id]: { items: all[id]?.items ?? [], hasMore: false, state: "error" } })),
      ),
    [source],
  );

  useEffect(() => {
    if (!activeId || threads[activeId]?.state === "ok") return;
    void loadLatest(activeId);
    // Only when another conversation opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, loadLatest]);

  usePolling(() => activeId && void loadLatest(activeId), THREAD_POLL_MS, !!activeId);

  const loadEarlier = async () => {
    if (!activeId || !thread || thread.loadingEarlier) return;
    const first = thread.items.find((m) => !m.status);
    if (!first) return;
    const id = activeId;
    setThreads((all) => ({ ...all, [id]: { ...all[id], loadingEarlier: true } }));
    try {
      const page = await source.page(id, first.createdAt);
      keepScroll.current = scrollRef.current ? scrollRef.current.scrollHeight - scrollRef.current.scrollTop : null;
      setThreads((all) => ({ ...all, [id]: { ...all[id], items: merge(all[id].items, page.items), hasMore: page.hasMore, loadingEarlier: false } }));
    } catch {
      setThreads((all) => ({ ...all, [id]: { ...all[id], loadingEarlier: false } }));
    }
  };

  // Stay at the bottom for new messages; keep the reading position when older ones are prepended.
  const lastId = thread?.items[thread.items.length - 1]?.id;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (keepScroll.current !== null) {
      el.scrollTop = el.scrollHeight - keepScroll.current;
      keepScroll.current = null;
    } else el.scrollTo({ top: el.scrollHeight });
  }, [lastId, activeId, thread?.items.length]);

  /* ---------------- sending */
  const deliver = async (conversationId: string, localId: string, body: string) => {
    try {
      const saved = await source.send(conversationId, body);
      setContactHidden(!!saved.moderation?.redacted);
      setThreads((all) => {
        const cur = all[conversationId];
        return { ...all, [conversationId]: { ...cur, items: merge(cur.items.filter((m) => m.id !== localId), [saved]) } };
      });
      setConvs((list) =>
        list
          ? sortConversations(
              list.map((c) => (c.id === conversationId ? { ...c, lastMessage: { body: saved.body, kind: saved.kind, senderId: saved.senderId, createdAt: saved.createdAt }, lastMessageAt: saved.createdAt } : c)),
            )
          : list,
      );
    } catch {
      setThreads((all) => {
        const cur = all[conversationId];
        return { ...all, [conversationId]: { ...cur, items: cur.items.map((m) => (m.id === localId ? { ...m, status: "failed" as const } : m)) } };
      });
    }
  };

  const send = (body: string) => {
    if (!activeId) return;
    const id = activeId;
    const localId = `local-${++localSeq.current}`;
    const optimistic: LocalMessage = { id: localId, senderId: "me", kind: "text", body, readAt: null, createdAt: new Date().toISOString(), status: "sending" };
    setThreads((all) => {
      const cur = all[id] ?? { items: [], hasMore: false, state: "ok" as const };
      return { ...all, [id]: { ...cur, items: [...cur.items, optimistic] } };
    });
    void deliver(id, localId, body);
  };

  const retry = (m: LocalMessage) => {
    if (!activeId) return;
    const id = activeId;
    setThreads((all) => ({ ...all, [id]: { ...all[id], items: all[id].items.map((x) => (x.id === m.id ? { ...x, status: "sending" as const } : x)) } }));
    void deliver(id, m.id, m.body ?? "");
  };

  /* ---------------- rendering */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!convs || !q) return convs ?? [];
    return convs.filter((c) => fullName(c.other).toLowerCase().includes(q) || (c.lastMessage?.body ?? "").toLowerCase().includes(q));
  }, [convs, query]);

  const open = (id: string) => {
    setActiveId(id);
    setMobilePane("thread");
  };

  const preview = (c: ApiConversation) => {
    const m = c.lastMessage;
    if (!m) return "";
    const text = m.kind === "text" ? (m.body ?? "") : m.kind === "homework" ? t("homework") : t("attachment");
    return m.senderId !== c.other.id ? t("youPreview", { text }) : text;
  };

  if (convs === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-navy-soft" role="status">
        {listError ? (
          <div className="flex flex-col items-center gap-3">
            <p className="max-w-md">{t("loadError")}</p>
            <button type="button" className="font-semibold text-teal-dark underline" onClick={() => void loadList()}>
              {t("tryAgain")}
            </button>
          </div>
        ) : (
          t("loading")
        )}
      </div>
    );
  }

  if (convs.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-[26px] font-extrabold">{t("title")}</h1>
        <span className="flex size-16 items-center justify-center rounded-full bg-white text-teal-dark">
          <Icon name="message" size={28} />
        </span>
        {openError && <p className="text-sm text-orange-dark">{t("openError")}</p>}
        <p className="text-navy-soft">{role === "student" ? t("emptyStudent") : t("emptyTeacher")}</p>
        <ButtonLink href={role === "student" ? "/teachers" : "/teacher/students"} variant="teal">
          {role === "student" ? t("findTeacher") : t("myStudents")}
        </ButtonLink>
      </div>
    );
  }

  const otherName = active ? fullName(active.other) : "";
  const items = thread?.items ?? [];
  const separators = items.map((m, i) => i === 0 || dates.dayKey(new Date(m.createdAt)) !== dates.dayKey(new Date(items[i - 1].createdAt)));

  return (
    <div className="flex h-dvh min-h-[560px] md:h-screen">
      {/* Conversation list */}
      <section
        className={cn("w-full shrink-0 flex-col border-e border-sand bg-white lg:flex lg:w-[340px] xl:w-[360px]", mobilePane === "list" || !active ? "flex" : "hidden")}
        aria-labelledby="messages-title"
      >
        <div className="flex flex-col gap-3.5 px-6 pt-7 pb-4">
          <h1 id="messages-title" className="text-[26px] font-extrabold">
            {t("title")}
          </h1>
          {demo && <p className="text-xs text-muted">{t("demoNotice")}</p>}
          {openError && (
            <p className="text-sm text-orange-dark" role="alert">
              {t("openError")}
            </p>
          )}
          <label className="flex h-[46px] items-center gap-2.5 rounded-xl bg-beige px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-teal">
            <Icon name="search" size={18} className="text-muted" />
            <span className="sr-only">{t("searchLabel")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <ul className="flex-1 overflow-y-auto" aria-label={t("conversations")}>
          {filtered.map((c) => {
            const isActive = c.id === activeId;
            const unread = c.unreadCount > 0 && !isActive;
            const when = lastActivity(c);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn("flex w-full gap-3 border-s-4 px-6 py-4 text-start text-navy", isActive ? "border-teal-dark bg-teal-50" : "border-transparent hover:bg-beige")}
                >
                  <PersonAvatar person={c.other} size={48} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex justify-between gap-2">
                      <span className="truncate font-semibold">{fullName(c.other)}</span>
                      {when && <span className="shrink-0 text-xs text-muted">{dates.short(when)}</span>}
                    </span>
                    <span className={cn("truncate text-sm", unread ? "font-semibold text-navy" : isActive ? "text-navy-soft" : "text-muted")}>
                      <bdi dir="auto">{preview(c)}</bdi>
                    </span>
                  </span>
                  {unread && (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center self-center rounded-full bg-orange-dark px-1.5 text-[11px] font-bold text-white">
                      <span aria-hidden="true">{c.unreadCount > 99 ? "99+" : c.unreadCount}</span>
                      <span className="sr-only">{t("unreadCount", { count: c.unreadCount })}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="px-6 py-4 text-sm text-muted">{t("noMatch", { query })}</li>}
        </ul>
      </section>

      {/* Thread */}
      {active ? (
        <section className={cn("min-w-0 flex-1 flex-col lg:flex", mobilePane === "thread" ? "flex" : "hidden")} aria-label={t("conversationWith", { name: otherName })}>
          <div className="flex min-h-[84px] items-center gap-3.5 border-b border-sand bg-white px-4 py-3 sm:px-7">
            <button
              type="button"
              onClick={() => setMobilePane("list")}
              className="-ms-1 inline-flex size-10 items-center justify-center rounded-full text-navy hover:bg-beige lg:hidden"
              aria-label={t("backToList")}
            >
              <Icon name="chevronLeft" />
            </button>
            <PersonAvatar person={active.other} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{otherName}</p>
              <p className="truncate text-[13px] text-muted">{active.other.role === "teacher" ? t("roleTeacher") : t("roleStudent")}</p>
            </div>
            {role === "student" && active.other.teacherSlug && (
              <ButtonLink href={`/teachers/${active.other.teacherSlug}`} variant="teal" size="sm" className="shrink-0 px-[18px] xl:hidden">
                {t("bookLesson")}
              </ButtonLink>
            )}
          </div>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-7" role="log" aria-live="polite" aria-label={t("conversationWith", { name: otherName })}>
            {thread?.hasMore && (
              <button
                type="button"
                onClick={() => void loadEarlier()}
                disabled={thread.loadingEarlier}
                className="self-center rounded-full border border-line bg-white px-4 py-1.5 text-sm font-semibold text-teal-dark hover:bg-beige disabled:opacity-60"
              >
                {thread.loadingEarlier ? t("loadingEarlier") : t("loadEarlier")}
              </button>
            )}
            {(!thread || thread.state === "loading") && (
              <p className="self-center text-sm text-muted" role="status">
                {t("loading")}
              </p>
            )}
            {thread?.state === "error" && (
              <div className="flex flex-col items-center gap-2 self-center text-center text-sm text-navy-soft" role="alert">
                <p className="max-w-md">{t("loadError")}</p>
                <button type="button" className="font-semibold text-teal-dark underline" onClick={() => void loadLatest(active.id)}>
                  {t("tryAgain")}
                </button>
              </div>
            )}
            {thread?.state === "ok" && thread.items.length === 0 && <p className="self-center text-sm text-muted">{t("noMessages")}</p>}
            {items.map((m, i) => {
              return (
                <div key={m.id} className="contents">
                  {separators[i] && <span className="self-center rounded-full bg-line-soft px-3 py-1 text-xs text-muted">{dates.day(m.createdAt)}</span>}
                  <Bubble m={m} mine={m.senderId !== active.other.id} name={otherName} onRetry={() => retry(m)} />
                </div>
              );
            })}
          </div>

          {contactHidden && (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-orange-100 px-4 py-2.5 text-sm text-orange-text sm:mx-7">
              {t("contactHidden")}{" "}
              <a href="/terms#non-circumvention" target="_blank" rel="noopener" className="font-semibold underline">
                {t("termsLink")}
              </a>
            </p>
          )}
          <p className="px-4 pt-3 text-xs text-muted sm:px-7">{t("safetyNotice")}</p>
          <form
            className="flex items-center gap-3 px-4 pt-2 pb-6 sm:px-7"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text) return;
              send(text);
              setDraft("");
            }}
          >
            <label className="flex h-[54px] min-w-0 flex-1 items-center rounded-full border border-line bg-white px-5 focus-within:border-teal-dark">
              <span className="sr-only">{t("messageLabel")}</span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("placeholder")}
                maxLength={MAX_LENGTH}
                dir="auto"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-muted"
              />
            </label>
            <button
              type="submit"
              aria-label={t("send")}
              disabled={!draft.trim()}
              className="inline-flex size-[54px] shrink-0 items-center justify-center rounded-full bg-orange text-navy hover:bg-[#ffa64d] disabled:opacity-60"
            >
              <Icon name="arrowRight" size={22} strokeWidth={2} />
            </button>
          </form>
        </section>
      ) : (
        <section className="hidden min-w-0 flex-1 items-center justify-center p-8 text-center text-navy-soft lg:flex">
          <p>{t("selectConversation")}</p>
        </section>
      )}

      {active && <InfoPanel c={active} role={role} />}
    </div>
  );
}
