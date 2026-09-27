"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Elapsed lesson time, counting up client-side from when the page mounted.
 * TODO: start from the lesson's real start time (server clock) once the lessons API exists.
 */
export function ElapsedTimer({ durationMin }: { durationMin: number }) {
  const t = useTranslations("classroom.timer");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

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
