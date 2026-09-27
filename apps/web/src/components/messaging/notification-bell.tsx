"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useMe } from "@/components/layout/role-gate";
import { Icon } from "@/components/ui/icon";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import type { ApiNotification } from "./types";
import { usePolling } from "./use-polling";

const POLL_MS = 60_000;
type Space = "student" | "teacher" | "admin";

const buttonClass = "relative inline-flex size-12 items-center justify-center rounded-full border border-sand bg-white text-navy hover:bg-beige";

/** Where a notification leads, by type and the viewer's space. */
export function notificationHref(type: string, space: Space): string | null {
  if (space === "admin") return type === "teacher_warning" ? "/admin" : type.startsWith("dispute_") ? "/admin/disputes" : null;
  if (type === "dispute_refunded" || type === "dispute_rejected") return space === "student" ? "/student/payments" : "/teacher/earnings";
  if (type === "message") return `/${space}/messages`;
  if (["booking_confirmed", "new_booking", "booking_cancelled", "lesson_cancelled", "lesson_summary", "lesson_reminder"].includes(type)) return `/${space}/lessons`;
  if (type === "homework_assigned") return "/student/homework";
  if (type === "refund") return "/student/payments";
  if (type === "payout" || type === "payout_issued") return "/teacher/earnings";
  if (type === "teacher_warning") return "/teacher/lessons";
  if (type.startsWith("teacher_")) return "/teach/apply";
  return null;
}

/** Titles are stored in English; known types are shown in the viewer's language, others as stored. */
function useNotificationTitle() {
  const t = useTranslations("messaging.types");
  return (n: ApiNotification) => {
    if (n.type === "message") {
      const name = /^New message from (.+)$/.exec(n.title)?.[1];
      return name ? t("message", { name }) : t("messageGeneric");
    }
    // Admins get a differently worded warning about a teacher: keep it as stored.
    if (n.type === "teacher_warning" && !n.title.startsWith("Warning")) return n.title;
    const key = n.type as Parameters<typeof t.has>[0];
    return n.type !== "message" && t.has(key) ? t(key as never) : n.title;
  };
}

function useRelativeTime() {
  const locale = useLocale() as Locale;
  return (iso: string) => {
    const rtf = new Intl.RelativeTimeFormat(intlTags[locale], { numeric: "auto" });
    const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const abs = Math.abs(s);
    if (abs < 60) return rtf.format(0, "second");
    if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (abs < 86_400) return rtf.format(Math.round(s / 3600), "hour");
    if (abs < 7 * 86_400) return rtf.format(Math.round(s / 86_400), "day");
    return new Intl.DateTimeFormat(intlTags[locale], { month: "short", day: "numeric" }).format(new Date(iso));
  };
}

/**
 * Notification bell of the dashboards: unread count (polled every 60 s) and a popover with the
 * latest in-app notifications. Demo mode (no API): a static bell.
 */
export function NotificationBell() {
  const t = useTranslations("messaging.bell");
  if (!API_URL) {
    return (
      <button type="button" aria-label={t("label")} className={buttonClass}>
        <Icon name="bell" />
      </button>
    );
  }
  return <LiveBell />;
}

function LiveBell() {
  const t = useTranslations("messaging.bell");
  const title = useNotificationTitle();
  const relative = useRelativeTime();
  const { call, isLoaded, isSignedIn } = useApi();
  const me = useMe();
  const pathname = usePathname();
  const space: Space = me?.role ?? (pathname.startsWith("/teacher") ? "teacher" : pathname.startsWith("/admin") ? "admin" : "student");

  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[] | null>(null);
  const [error, setError] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const headingId = useId();
  const ready = isLoaded && isSignedIn;

  const refreshCount = useCallback(() => {
    call<{ count: number }>("/notifications/unread-count").then(
      (r) => setCount(r.count),
      () => undefined,
    );
  }, [call]);

  const loadList = useCallback(() => {
    setError(false);
    call<ApiNotification[]>("/notifications?limit=20").then(
      (list) => {
        setItems(list);
        setCount((c) => Math.max(c, list.filter((n) => !n.readAt).length));
      },
      () => setError(true),
    );
  }, [call]);

  useEffect(() => {
    if (ready) refreshCount();
  }, [ready, refreshCount]);
  usePolling(
    () => {
      refreshCount();
      if (open) loadList();
    },
    POLL_MS,
    ready,
  );

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Esc closes (focus back on the bell); a click outside closes.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const toggle = () => {
    if (!open) loadList();
    setOpen((o) => !o);
  };

  const markRead = (ids?: string[]) => {
    const now = new Date().toISOString();
    setItems((list) => list?.map((n) => (!ids || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n)) ?? list);
    setCount((c) => (ids ? Math.max(0, c - ids.length) : 0));
    call<{ updated: number }>("/notifications/read", { method: "POST", body: JSON.stringify(ids ? { ids } : {}) }).then(refreshCount, refreshCount);
  };

  const unread = items?.some((n) => !n.readAt) || count > 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={count > 0 ? t("labelUnread", { count }) : t("label")}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={toggle}
        className={buttonClass}
      >
        <Icon name="bell" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -end-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-orange-dark px-1 text-[11px] leading-none font-bold text-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="absolute end-0 top-full z-40 mt-2 flex max-h-[70vh] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-sand bg-white text-start shadow-lg outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
            <h2 id={headingId} className="text-base font-bold">
              {t("title")}
            </h2>
            <div className="flex items-center gap-1">
              {unread && (
                <button type="button" onClick={() => markRead()} className="rounded-full px-2 py-1 text-sm font-semibold text-teal-dark hover:text-navy">
                  {t("markAllRead")}
                </button>
              )}
              <button type="button" onClick={() => close(true)} aria-label={t("close")} className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-beige">
                <Icon name="x" size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto">
            {error && !items ? (
              <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-navy-soft" role="alert">
                <p>{t("error")}</p>
                <button type="button" onClick={loadList} className="font-semibold text-teal-dark underline">
                  {t("tryAgain")}
                </button>
              </div>
            ) : !items ? (
              <p className="px-5 py-8 text-center text-sm text-muted" role="status">
                {t("loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">{t("empty")}</p>
            ) : (
              <ul>
                {items.map((n) => {
                  const href = notificationHref(n.type, space);
                  const content = (
                    <>
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-orange-dark")}>
                        {!n.readAt && <span className="sr-only">{t("unread")}</span>}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-sm", n.readAt ? "text-navy-soft" : "font-semibold text-navy")}>{title(n)}</span>
                        {n.body && (
                          <span className="line-clamp-2 text-sm text-muted">
                            <bdi dir="auto">{n.body}</bdi>
                          </span>
                        )}
                        <time dateTime={n.createdAt} className="text-xs text-muted">
                          {relative(n.createdAt)}
                        </time>
                      </span>
                    </>
                  );
                  const cls = "flex w-full gap-3 border-b border-line-soft px-5 py-3.5 text-start last:border-b-0";
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link
                          href={href}
                          className={cn(cls, "hover:bg-beige")}
                          onClick={() => {
                            if (!n.readAt) markRead([n.id]);
                            close(false);
                          }}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className={cls}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
