/**
 * What the classroom timer shows at a given moment (pure; unit tests in apps/web/test/helpers.test.ts).
 * - before the start: a countdown to the start ("starts in 03:12");
 * - during the lesson: minutes taught / lesson length, and the time left;
 * - after the planned end: the overtime (shown in orange).
 */
export type LessonClock =
  | { phase: "before"; secondsToStart: number }
  | { phase: "during"; elapsed: number; remaining: number; total: number }
  | { phase: "overtime"; elapsed: number; total: number };

export function lessonClock(startsAtMs: number, durationMin: number, nowMs: number): LessonClock {
  const total = Math.max(0, Math.round(durationMin * 60));
  const diff = Math.floor((nowMs - startsAtMs) / 1000);
  if (diff < 0) return { phase: "before", secondsToStart: -diff };
  if (diff <= total) return { phase: "during", elapsed: diff, remaining: total - diff, total };
  return { phase: "overtime", elapsed: diff, total };
}

/** 75 → "01:15", 3725 → "1:02:05". */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
