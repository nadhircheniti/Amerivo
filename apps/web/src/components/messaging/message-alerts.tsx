"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMe } from "@/components/layout/role-gate";
import { Icon } from "@/components/ui/icon";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { conversationHref, nextAlert, parseUnreadSummary, type AlertWatermark, type LatestUnread } from "./message-alert-logic";

/** Poll cadence: often while the tab is in front, slowly in the background (desktop alerts). */
const VISIBLE_MS = 20_000;
const HIDDEN_MS = 60_000;
const TOAST_MS = 12_000;

type Space = "student" | "teacher";
type UnreadMessages = { count: number; refresh: () => void };

const UnreadMessagesContext = createContext<UnreadMessages | null>(null);

/** Unread message count of the signed-in student/teacher (null outside <MessageAlerts> or in demo mode). */
export const useUnreadMessages = () => useContext(UnreadMessagesContext);

/**
 * New-message notifications for the student and teacher spaces:
 * - the unread count (sidebar badge on "Messages"),
 * - an on-screen alert with the sender and a preview when a message arrives (not on the messages
 *   screen itself, where the conversation updates on its own),
 * - an optional desktop notification when the tab is in the background (the user opts in).
 * Previews come from the API already screened (contact details hidden, Terms §8).
 */
export function MessageAlerts({ space, children }: { space: Space; children: ReactNode }) {
  if (!API_URL) return <>{children}</>;
  return <LiveMessageAlerts space={space}>{children}</LiveMessageAlerts>;
}

function LiveMessageAlerts({ space, children }: { space: Space; children: ReactNode }) {
  const { call, isLoaded, isSignedIn } = useApi();
  const me = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("messaging");
  // Admins looking at a space have no conversations (the API answers 403): no polling for them.
  const enabled = isLoaded && !!isSignedIn && (!me || me.role === space);
  const onMessagesScreen = pathname === `/${space}/messages` || pathname.startsWith(`/${space}/messages/`);

  const [count, setCount] = useState(0);
  const [toast, setToast] = useState<LatestUnread | null>(null);
  const watermark = useRef<AlertWatermark>(null);
  const onMessagesRef = useRef(onMessagesScreen);
  const inFlight = useRef(false);
  useEffect(() => {
    onMessagesRef.current = onMessagesScreen;
  }, [onMessagesScreen]);

  const desktopAlert = useCallback(
    (m: LatestUnread, title: string, body: string) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
      try {
        // One notification per conversation: a newer message replaces the previous one.
        const n = new Notification(title, { body, tag: `amerivo-message-${m.conversationId}`, icon: "/icon.svg" });
        n.onclick = () => {
          window.focus();
          router.push(conversationHref(space, m.conversationId));
          n.close();
        };
      } catch {
        // Some mobile browsers only allow notifications from a service worker: the on-screen alert remains.
      }
    },
    [router, space],
  );

  const previewOf = useCallback((m: LatestUnread) => m.preview || (m.kind === "homework" ? t("view.homework") : m.kind === "file" ? t("view.attachment") : ""), [t]);
  const titleOf = useCallback((m: LatestUnread) => (m.senderFirstName ? t("types.message", { name: m.senderFirstName }) : t("types.messageGeneric")), [t]);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    call<unknown>("/messages/unread-count")
      .then(
        (raw) => {
          const summary = parseUnreadSummary(raw);
          if (!summary) return;
          setCount(summary.count);
          const next = nextAlert(watermark.current, summary, onMessagesRef.current);
          watermark.current = next.watermark;
          if (next.announce) {
            setToast(next.announce);
            desktopAlert(next.announce, titleOf(next.announce), previewOf(next.announce));
          }
        },
        () => undefined, // keep the last known state (the server may be waking up)
      )
      .finally(() => {
        inFlight.current = false;
      });
  }, [call, desktopAlert, previewOf, titleOf]);

  // Poll: every 20 s in front, every 60 s in the background, and right away when the tab comes back.
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, document.visibilityState === "visible" ? VISIBLE_MS : HIDDEN_MS);
    };
    const tick = () => {
      refresh();
      schedule();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
      else schedule();
    };
    tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refresh]);

  // Opening the messages screen: the alert is hidden there, and the count changes soon.
  useEffect(() => {
    if (!enabled || !onMessagesScreen) return;
    const id = window.setTimeout(refresh, 1_500);
    return () => window.clearTimeout(id);
  }, [enabled, onMessagesScreen, refresh]);

  const shown = onMessagesScreen ? null : toast;
  const close = useCallback(() => setToast(null), []);
  const value = useMemo<UnreadMessages>(() => ({ count, refresh }), [count, refresh]);

  return (
    <UnreadMessagesContext.Provider value={enabled ? value : null}>
      {children}
      <MessageToast space={space} message={shown} title={shown ? titleOf(shown) : ""} preview={shown ? previewOf(shown) : ""} onClose={close} />
    </UnreadMessagesContext.Provider>
  );
}

/** On-screen alert (bottom corner). The live region stays mounted so screen readers announce it. */
function MessageToast({ space, message, title, preview, onClose }: { space: Space; message: LatestUnread | null; title: string; preview: string; onClose: () => void }) {
  const t = useTranslations("messaging.alert");
  const [paused, setPaused] = useState(false);
  /** Answer to the permission prompt; before that, the browser's current setting is read when shown. */
  const [answered, setAnswered] = useState<NotificationPermission | null>(null);
  const permission = !message ? null : (answered ?? (typeof Notification === "undefined" ? "unsupported" : Notification.permission));

  // Hides itself after a while, unless the pointer or the keyboard focus is on it.
  useEffect(() => {
    if (!message || paused) return;
    const id = window.setTimeout(onClose, TOAST_MS);
    return () => window.clearTimeout(id);
  }, [message, paused, onClose]);

  useEffect(() => {
    if (!message) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [message, onClose]);

  const enableDesktop = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setAnswered, () => undefined);
  };

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-auto sm:end-6 sm:bottom-6">
      {message && (
        <div
          key={message.id}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="pointer-events-auto flex w-full max-w-[380px] gap-3 rounded-2xl border border-sand bg-white p-4 text-start text-navy shadow-lg"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-dark">
            <Icon name="message" size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm font-bold">{title}</p>
            {preview && (
              <p className="line-clamp-2 text-sm text-navy-soft">
                <bdi dir="auto">{preview}</bdi>
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href={conversationHref(space, message.conversationId)} onClick={onClose} className="text-sm font-semibold text-teal-dark underline-offset-2 hover:underline">
                {t("open")}
              </Link>
              {permission === "default" && (
                <button type="button" onClick={enableDesktop} className="text-sm font-semibold text-muted underline-offset-2 hover:text-navy hover:underline">
                  {t("enableDesktop")}
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("dismiss")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-beige"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
