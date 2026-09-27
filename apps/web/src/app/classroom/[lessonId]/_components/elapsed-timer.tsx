"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Elapsed lesson time: from the lesson's start time when known (00:00 before it), else from when the page opened. */
export function ElapsedTimer({ durationMin, startsAt }: { durationMin: number; startsAt?: string }) {
  const t = useTranslations("classroom.timer");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = startsAt ? new Date(startsAt).getTime() : Date.now();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startsAt]);

  const total = durationMin * 60;
  return (
    <span
      role="timer"
      aria-label={t("label", { elapsed: fmt(seconds), total: fmt(total) })}
      className="rounded-full bg-white/8 px-4 py-2 font-display text-base font-bold tabular-nums"
    >
      <span className={seconds > total ? "text-orange" : undefined}>{fmt(seconds)}</span> <span className="font-medium text-ink-soft">/ {fmt(total)}</span>
    </span>
  );
}
