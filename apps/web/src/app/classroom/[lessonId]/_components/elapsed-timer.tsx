"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatClock, lessonClock } from "./lesson-clock";

/**
 * Lesson timer in the classroom header. With the lesson's start time (live classroom): a countdown
 * before the start, then the minutes taught out of the lesson length and the time left. Without it
 * (demo classroom): counts from when the page opened.
 */
export function ElapsedTimer({ durationMin, startsAt }: { durationMin: number; startsAt?: string }) {
  const t = useTranslations("classroom.timer");
  // The page's opening time is the start in demo mode; fixed once so the timer counts from it.
  const [start] = useState(() => (startsAt ? new Date(startsAt).getTime() : Date.now()));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const c = lessonClock(Number.isFinite(start) ? start : now, durationMin, now);
  const total = formatClock(durationMin * 60);
  const pill = "rounded-full bg-white/8 px-4 py-2 font-display text-base font-bold tabular-nums";

  if (c.phase === "before") {
    const left = formatClock(c.secondsToStart);
    return (
      <span role="timer" aria-label={t("startsInLabel", { time: left })} className={pill}>
        <span className="font-medium text-ink-soft">{t("startsIn")}</span> {left}
      </span>
    );
  }
  const elapsed = formatClock(c.elapsed);
  return (
    <span role="timer" aria-label={t("label", { elapsed, total })} className={pill}>
      <span className={c.phase === "overtime" ? "text-orange" : undefined}>{elapsed}</span> <span className="font-medium text-ink-soft">/ {total}</span>
      {c.phase === "during" && <span className="ms-2 hidden text-sm font-medium text-ink-soft sm:inline">· {t("left", { time: formatClock(c.remaining) })}</span>}
    </span>
  );
}
