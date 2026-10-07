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

/** The classroom warns this many minutes before the end of the lesson. */
export const ENDING_SOON_MIN = 5;

/**
 * Where the classroom stands (pure): before / during the lesson, "ending soon" in the last
 * 5 minutes, then closed at the planned end (a 50-minute lesson ends at minute 50).
 */
export type ClassroomPhase = "before" | "during" | "endingSoon" | "closed";

export function classroomPhase(nowMs: number, startsAtMs: number, durationMin: number): ClassroomPhase {
  const endMs = startsAtMs + durationMin * 60_000;
  if (nowMs >= endMs) return "closed";
  if (nowMs < startsAtMs) return "before";
  return nowMs >= endMs - ENDING_SOON_MIN * 60_000 ? "endingSoon" : "during";
}
