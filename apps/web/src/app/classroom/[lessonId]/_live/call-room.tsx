"use client";

import Daily, { type DailyCall } from "@daily-co/daily-js";
import {
  DailyAudio,
  DailyProvider,
  DailyVideo,
  useAudioTrack,
  useDaily,
  useDailyEvent,
  useLocalSessionId,
  useMeetingState,
  useNetwork,
  useParticipantIds,
  useScreenShare,
  useVideoTrack,
} from "@daily-co/daily-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import { ElapsedTimer } from "../_components/elapsed-timer";
import { LocalIcon } from "../_components/local-icons";
import { usePolling } from "@/components/messaging/use-polling";
import { ReportButton } from "@/components/safety/report-button";
import type { ClassroomInfo } from "./types";

/** Creates the Daily call object, joins the private room and cleans up when leaving the page. */
export function CallRoom({ info, roomUrl, token }: { info: ClassroomInfo; roomUrl: string; token: string }) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [failed, setFailed] = useState(false);
  const t = useTranslations("classroom.live");

  useEffect(() => {
    const co = Daily.getCallInstance() ?? Daily.createCallObject({ subscribeToTracksAutomatically: true });
    // The call object is an external system created on mount; React state just hands it to the provider.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCallObject(co);
    co.join({ url: roomUrl, token }).catch(() => setFailed(true));
    return () => {
      void co.leave().finally(() => co.destroy());
    };
  }, [roomUrl, token]);

  if (failed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-navy-deep p-6 text-center text-ink-soft">
        <p>{t("callError")}</p>
      </div>
    );
  }
  if (!callObject) return null;
  return (
    <DailyProvider callObject={callObject}>
      <Room info={info} />
      <DailyAudio />
    </DailyProvider>
  );
}

function Room({ info }: { info: ClassroomInfo }) {
  const t = useTranslations("classroom.live");
  const tc = useTranslations("classroom.controls");
  const daily = useDaily();
  const router = useRouter();
  const { call } = useApi();
  const meeting = useMeetingState();
  const { threshold } = useNetwork();
  const localId = useLocalSessionId();
  const remoteIds = useParticipantIds({ filter: "remote" });
  const { screens, isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();
  const micOff = useAudioTrack(localId).isOff;
  const camOff = useVideoTrack(localId).isOff;
  const [deviceError, setDeviceError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const everJoined = useRef(false);

  const isTeacher = info.role === "teacher";
  const other = isTeacher ? info.student : info.teacher;
  const remoteId = remoteIds[0];
  useEffect(() => {
    if (remoteId) everJoined.current = true;
  }, [remoteId]);
  // Re-evaluated every 15 s: "End lesson" replaces "Leave" once the lesson has started.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const screen = screens[0];
  const canShare = typeof window !== "undefined" && Daily.supportedBrowser().supportsScreenShare;

  useDailyEvent(
    "camera-error",
    useCallback(() => setDeviceError(true), []),
  );
  useDailyEvent(
    "participant-left",
    useCallback(() => setNotice(t("left", { name: other.firstName })), [t, other.firstName]),
  );
  useDailyEvent(
    "participant-joined",
    useCallback(() => setNotice(null), []),
  );

  const started = now >= new Date(info.startsAt).getTime();

  async function leave() {
    setEnding(true);
    if (isTeacher && Date.now() >= new Date(info.startsAt).getTime()) {
      if (!window.confirm(t("endConfirm"))) return setEnding(false);
      try {
        await call(`/bookings/${info.bookingId}/complete`, { method: "POST", body: JSON.stringify({ attendance: everJoined.current ? "attended" : "no_show" }) });
      } catch {
        // Already completed or not allowed: the report page shows the right state.
      }
      await daily?.leave();
      router.push(`/teacher/lessons/${info.bookingId}/report`);
      return;
    }
    await daily?.leave();
    router.push(isTeacher ? "/teacher" : "/student");
  }

  const status = meeting === "joined-meeting" ? (threshold === "good" ? "good" : "poor") : meeting === "error" ? "error" : "connecting";

  return (
    <div className="flex min-h-dvh flex-col bg-navy-deep text-white lg:h-dvh">
      <header className="flex min-h-[72px] shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/8 px-4 py-3 sm:px-7">
        <LogoMark size={34} onDark />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold">{t("lessonTitle", { type: info.type, name: other.firstName || "—" })}</h1>
          <p className="truncate text-[13px] text-ink-soft">{info.topic ?? t("participants", { teacher: info.teacher.firstName, student: info.student.firstName })}</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-2 text-sm" role="status">
          <span className={cn("size-2 rounded-full", status === "good" ? "bg-teal" : status === "connecting" ? "bg-yellow" : "bg-orange")} aria-hidden="true" />
          {t(`status.${status}`)}
        </span>
        <ElapsedTimer durationMin={info.durationMin} startsAt={info.startsAt} />
        <ReportButton reportedUserId={other.id} name={other.firstName} bookingId={info.bookingId} tone="dark" />
      </header>

      <div className="flex flex-1 flex-col gap-4 px-3 pt-4 sm:px-4 lg:min-h-0 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0">
          {(deviceError || notice) && (
            <p role="alert" className="rounded-2xl bg-orange/15 px-5 py-3 text-sm text-orange">
              {deviceError ? t("deviceError") : notice}
            </p>
          )}

          {/* Stage: shared screen, else the other person; self-view in the corner */}
          <section aria-label={t("stage")} className="relative flex min-h-[380px] flex-1 overflow-hidden rounded-[20px] bg-[#16384f] lg:min-h-0">
            {screen ? (
              <DailyVideo sessionId={screen.session_id} type="screenVideo" fit="contain" className="size-full bg-black" />
            ) : remoteId ? (
              <RemoteTile sessionId={remoteId} name={other.firstName} />
            ) : (
              <div className="m-auto flex flex-col items-center gap-4 p-6 text-center">
                <Initials name={`${other.firstName} ${other.lastName}`} size={120} />
                <p className="text-ink-soft">{t("waiting", { name: other.firstName })}</p>
              </div>
            )}
            <div className="absolute end-4 bottom-4 flex flex-col gap-2">
              {screen && remoteId && <SmallTile sessionId={remoteId} name={other.firstName} />}
              {localId && <SmallTile sessionId={localId} name={t("you")} local />}
            </div>
          </section>

          <div role="toolbar" aria-label={tc("toolbar")} className="flex min-h-[92px] shrink-0 flex-wrap items-center justify-center gap-3 py-3">
            <Toggle label={micOff ? t("micOn") : t("micOff")} pressed={micOff} onClick={() => daily?.setLocalAudio(micOff)}>
              {micOff ? <LocalIcon name="micOff" /> : <Icon name="mic" size={22} />}
            </Toggle>
            <Toggle label={camOff ? t("camOn") : t("camOff")} pressed={camOff} onClick={() => daily?.setLocalVideo(camOff)}>
              {camOff ? <LocalIcon name="videoOff" /> : <Icon name="video" size={22} />}
            </Toggle>
            {canShare && (
              <Toggle
                label={isSharingScreen ? t("stopShare") : tc("shareScreen")}
                pressed={isSharingScreen}
                tone="accent"
                onClick={() => (isSharingScreen ? stopScreenShare() : startScreenShare())}
              >
                <Icon name="screen" size={22} />
              </Toggle>
            )}
            <span className="mx-1.5 hidden h-9 w-px bg-white/15 sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={() => void leave()}
              disabled={ending}
              className="inline-flex h-14 items-center gap-2 rounded-full bg-danger px-6 text-[15px] font-semibold text-white hover:bg-[#a93226] disabled:opacity-60"
            >
              <Icon name="phoneOff" size={22} />
              {isTeacher && started ? tc("endLesson") : t("leave")}
            </button>
          </div>
        </div>

        <LivePanel info={info} otherName={other.firstName} />
      </div>
    </div>
  );
}

function RemoteTile({ sessionId, name }: { sessionId: string; name: string }) {
  const off = useVideoTrack(sessionId).isOff;
  if (off)
    return (
      <div className="m-auto">
        <Initials name={name} size={140} />
      </div>
    );
  return <DailyVideo sessionId={sessionId} type="video" fit="cover" className="size-full" />;
}

function SmallTile({ sessionId, name, local = false }: { sessionId: string; name: string; local?: boolean }) {
  const off = useVideoTrack(sessionId).isOff;
  return (
    <div className="relative h-[110px] w-[160px] overflow-hidden rounded-2xl border-2 border-white/20 bg-[#2e5872] sm:h-[135px] sm:w-[200px]">
      {off ? (
        <div className="flex size-full items-center justify-center">
          <Initials name={name} size={56} />
        </div>
      ) : (
        <DailyVideo sessionId={sessionId} type="video" fit="cover" automirror={local} className="size-full" />
      )}
      <span className="absolute start-2 bottom-2 rounded-md bg-navy/70 px-2 py-0.5 text-xs">{name}</span>
    </div>
  );
}

function Initials({ name, size }: { name: string; size: number }) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="flex items-center justify-center rounded-full bg-teal-100 font-display font-bold text-teal-dark"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
      aria-hidden="true"
    >
      {letters || "?"}
    </span>
  );
}

function Toggle({ label, pressed, onClick, tone = "danger", children }: { label: string; pressed: boolean; onClick: () => void; tone?: "danger" | "accent"; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex size-14 items-center justify-center rounded-full transition-colors",
        !pressed && "bg-white/12 text-white hover:bg-white/20",
        pressed && tone === "danger" && "bg-danger text-white hover:bg-[#a93226]",
        pressed && tone === "accent" && "bg-orange text-navy hover:bg-[#ffa64d]",
      )}
    >
      {children}
    </button>
  );
}

type ChatMessage = { id: string; senderId: string; body: string; createdAt: string };
type Live = { messages: ChatMessage[]; notes: string };
type Screened = { moderation?: { redacted: boolean; types: string[] } };

/** How often the panel asks the API for new chat messages and the latest shared notes. */
const LIVE_POLL_MS = 2500;

/**
 * Chat and shared notes. Both go through the API (not peer-to-peer): they are kept with the lesson,
 * and contact details are hidden before the other person sees them (Terms §8).
 */
function LivePanel({ info, otherName }: { info: ClassroomInfo; otherName: string }) {
  const t = useTranslations("classroom.live");
  const { call } = useApi();
  const myId = info.role === "teacher" ? info.teacher.id : info.student.id;
  const [tab, setTab] = useState<"chat" | "notes">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [warning, setWarning] = useState(false);
  const [notes, setNotes] = useState(info.notes);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const lastTyped = useRef(0);
  const saving = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  const addMessages = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !known.has(m.id))];
      return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    });
  }, []);

  const poll = useCallback(() => {
    // The cursor only moves with what a poll returned (never with our own sent message), so a message
    // the other person sent just before ours is never skipped. The API includes `after` itself.
    const q = lastAt.current ? `?${new URLSearchParams({ after: lastAt.current })}` : "";
    call<Live>(`/bookings/${info.bookingId}/live${q}`)
      .then((live) => {
        addMessages(live.messages);
        const newest = live.messages.reduce((a, m) => (m.createdAt > a ? m.createdAt : a), lastAt.current ?? "");
        if (newest) lastAt.current = newest;
        // The other person's notes replace ours unless we are typing or saving right now.
        if (!saving.current && Date.now() - lastTyped.current > 3000) setNotes(live.notes);
      })
      .catch(() => undefined); // next poll will retry
  }, [call, info.bookingId, addMessages]);

  useEffect(() => {
    poll();
  }, [poll]);
  usePolling(poll, LIVE_POLL_MS);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function sendChat() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setChatError(null);
    try {
      const m = await call<ChatMessage & Screened>(`/bookings/${info.bookingId}/chat`, { method: "POST", body: JSON.stringify({ body: text }) });
      addMessages([m]);
      setWarning(!!m.moderation?.redacted);
      setDraft("");
    } catch (e) {
      setChatError((e as Error).message || t("chatError"));
    } finally {
      setSending(false);
    }
  }

  function editNotes(text: string) {
    setNotes(text);
    lastTyped.current = Date.now();
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const typedAt = lastTyped.current;
      saving.current = true;
      call<({ notes: string } & Screened)[]>(`/bookings/${info.bookingId}/notes`, { method: "PUT", body: JSON.stringify({ notes: text }) })
        .then((rows) => {
          setSaveState("saved");
          const saved = rows[0];
          if (saved?.moderation?.redacted) {
            setWarning(true);
            // Show what the other person sees, unless more was typed meanwhile.
            if (lastTyped.current === typedAt) setNotes(saved.notes);
          }
        })
        .catch(() => setSaveState("idle"))
        .finally(() => {
          saving.current = false;
        });
    }, 1200);
  }

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-[20px] bg-white text-navy lg:mb-4 lg:w-[360px]">
      <div role="tablist" aria-label={t("panel")} className="m-3 flex gap-1 rounded-xl bg-beige p-1">
        {(["chat", "notes"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("h-[42px] flex-1 rounded-[10px] text-sm", tab === id ? "bg-white font-semibold shadow-[0_2px_6px_rgb(15_59_91/0.1)]" : "hover:bg-white/60")}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      {warning && (
        <p role="alert" className="mx-3 mb-2 rounded-xl bg-orange-100 px-3 py-2 text-xs leading-normal text-orange-text">
          {t("contactHidden")}{" "}
          <a href="/terms#non-circumvention" target="_blank" rel="noopener" className="font-semibold underline">
            {t("termsLink")}
          </a>
        </p>
      )}

      {tab === "chat" ? (
        <>
          <div ref={listRef} className="flex min-h-[220px] flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-3" aria-live="polite">
            {messages.length === 0 && <p className="m-auto max-w-[240px] text-center text-sm text-muted">{t("chatEmpty")}</p>}
            {messages.map((m) => {
              const mine = m.senderId === myId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[280px] rounded-[14px] px-3.5 py-2.5 text-sm leading-normal",
                    mine ? "self-end rounded-ee-[4px] bg-navy text-white" : "self-start rounded-es-[4px] bg-beige",
                  )}
                >
                  {!mine && <strong className="block text-xs text-teal-dark">{otherName}</strong>}
                  <span dir="auto" className="block whitespace-pre-wrap">
                    {m.body}
                  </span>
                </div>
              );
            })}
          </div>
          {chatError && (
            <p role="alert" className="mx-3 mb-2 text-xs text-danger-text">
              {chatError}
            </p>
          )}
          <p className="mx-4 mb-1.5 text-[11px] leading-snug text-muted">{t("monitored")}</p>
          <form
            className="m-3 mt-0 flex items-center gap-2 rounded-xl border border-line px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendChat();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("chatPlaceholder", { name: otherName })}
              aria-label={t("chatPlaceholder", { name: otherName })}
              maxLength={2000}
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted focus:outline-none"
              dir="auto"
            />
            <button type="submit" disabled={sending} aria-label={t("send")} className="flex size-9 items-center justify-center rounded-full bg-teal-dark text-white disabled:opacity-60">
              <LocalIcon name="send" size={16} />
            </button>
          </form>
        </>
      ) : (
        <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
          <textarea
            value={notes}
            onChange={(e) => editNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            aria-label={t("tabs.notes")}
            maxLength={20000}
            dir="auto"
            className="min-h-[240px] flex-1 resize-none rounded-xl border border-line p-3 text-sm leading-relaxed focus:border-teal-dark focus:outline-none"
          />
          <span className="text-xs text-muted" role="status">
            {saveState === "saving" ? t("notesSaving") : saveState === "saved" ? t("notesSaved") : t("notesHint")}
          </span>
        </div>
      )}
    </aside>
  );
}
