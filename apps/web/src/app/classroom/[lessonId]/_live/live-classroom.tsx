"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { intlTags } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { CallRoom } from "./call-room";
import type { ClassroomInfo } from "./types";

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: "notFound" | "notParticipant" | "unavailable" }
  | { kind: "lobby"; info: ClassroomInfo }
  | { kind: "call"; info: ClassroomInfo; roomUrl: string; token: string };

/**
 * Real classroom: checks the lesson with the API, shows a lobby (opening time, "Join" button),
 * then the Daily.co call. The two participants get a private room and personal tokens.
 */
export function LiveClassroom({ bookingId }: { bookingId: string }) {
  const t = useTranslations("classroom.live");
  const locale = useLocale();
  const { call, isLoaded, isSignedIn } = useApi();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<ClassroomInfo>(`/bookings/${bookingId}/classroom`)
      .then((info) => !cancelled && setPhase({ kind: "lobby", info }))
      .catch((e) => {
        if (cancelled) return;
        const status = e instanceof ApiError ? e.status : 0;
        setPhase({ kind: "error", message: status === 403 ? "notParticipant" : status === 404 || status === 400 ? "notFound" : "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, call, isLoaded, isSignedIn]);

  const fmtTime = new Intl.DateTimeFormat(intlTags[locale as keyof typeof intlTags], { hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtDay = new Intl.DateTimeFormat(intlTags[locale as keyof typeof intlTags], { weekday: "long", day: "numeric", month: "long" });

  if (phase.kind === "call") {
    return <CallRoom info={phase.info} roomUrl={phase.roomUrl} token={phase.token} />;
  }

  const home = phase.kind === "lobby" && phase.info.role === "teacher" ? "/teacher" : "/student";

  async function join(info: ClassroomInfo) {
    setJoining(true);
    setJoinError(null);
    try {
      const res = await call<{ roomUrl: string; token: string }>(`/bookings/${bookingId}/join`, { method: "POST" });
      setPhase({ kind: "call", info, roomUrl: res.roomUrl, token: res.token });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setJoinError(status === 403 ? t("notParticipant") : status === 503 ? t("unavailable") : (e as Error).message);
    } finally {
      setJoining(false);
    }
  }

  let body: React.ReactNode;
  if (phase.kind === "loading") {
    body = (
      <p role="status" className="text-ink-soft">
        {t("loading")}
      </p>
    );
  } else if (phase.kind === "error") {
    body = <p className="text-ink-soft">{t(phase.message)}</p>;
  } else {
    const { info } = phase;
    const other = info.role === "teacher" ? info.student : info.teacher;
    const start = new Date(info.startsAt);
    const end = new Date(start.getTime() + info.durationMin * 60_000);
    const opens = new Date(info.opensAt).getTime();
    const closes = new Date(info.closesAt).getTime();
    const state = info.status !== "confirmed" ? "notConfirmed" : now < opens ? "early" : now > closes ? "ended" : "open";
    body = (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-extrabold text-white sm:text-[30px]">{t("lessonTitle", { type: info.type, name: other.firstName || "—" })}</h1>
          <p className="text-ink-soft">{t("when", { date: fmtDay.format(start), start: fmtTime.format(start), end: fmtTime.format(end) })}</p>
          {info.topic && <p className="text-ink-soft">{t("topic", { topic: info.topic })}</p>}
        </div>
        {state === "open" && (
          <>
            <p className="rounded-2xl bg-white/8 px-5 py-4 text-sm leading-relaxed text-ink-soft">{t("tip")}</p>
            {joinError && (
              <p role="alert" className="rounded-2xl bg-danger-100 px-5 py-4 text-sm font-semibold text-danger-text">
                {joinError}
              </p>
            )}
            <Button size="lg" onClick={() => void join(info)} disabled={joining || info.role === "admin"} className="self-start px-8">
              {joining ? t("joining") : t("join")}
            </Button>
            {info.role === "admin" && <p className="text-sm text-ink-soft">{t("notParticipant")}</p>}
          </>
        )}
        {state === "early" && (
          <p className="rounded-2xl bg-white/8 px-5 py-4 text-ink-soft">{t("opensAt", { time: fmtTime.format(new Date(opens)), date: fmtDay.format(new Date(opens)) })}</p>
        )}
        {state === "ended" && <p className="rounded-2xl bg-white/8 px-5 py-4 text-ink-soft">{t("ended")}</p>}
        {state === "notConfirmed" && <p className="rounded-2xl bg-white/8 px-5 py-4 text-ink-soft">{t("notConfirmed")}</p>}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-navy-deep text-white">
      <header className="flex min-h-[72px] items-center gap-4 border-b border-white/8 px-4 sm:px-7">
        <LogoMark size={34} onDark />
        <span className="font-display font-bold">{t("classroom")}</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-[560px] flex-col gap-6 rounded-3xl bg-white/5 p-7 sm:p-10">
          {body}
          <ButtonLink href={home} variant="outlineLight" className="self-start">
            {t("back")}
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
