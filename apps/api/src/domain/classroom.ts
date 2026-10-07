/** Default and maximum number of minutes the classroom opens before the lesson starts. */
export const CLASSROOM_EARLY_DEFAULT_MIN = 5;
export const CLASSROOM_EARLY_MAX_MIN = 15;
/**
 * Minutes the classroom stays open after the planned end: none. A 50-minute lesson ends at minute
 * 50 for both people (Amerivo's rule); the classroom warns 5 minutes before (web). The teacher
 * writes the report afterwards from their dashboard.
 */
export const CLASSROOM_LATE_MIN = 0;

/**
 * How early the classroom (join link + video room) opens before the lesson: 5 minutes by default,
 * so both people can check their camera and microphone. CLASSROOM_EARLY_MIN can change it between
 * 0 and 15 minutes; larger values are capped (QA: a link usable a day early was reported as a bug).
 */
export const classroomEarlyMin = () => {
  const raw = process.env.CLASSROOM_EARLY_MIN;
  const v = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(v) && v >= 0 ? Math.min(v, CLASSROOM_EARLY_MAX_MIN) : CLASSROOM_EARLY_DEFAULT_MIN;
};

/** When the classroom of a lesson opens and closes. */
export function classroomWindow(b: { startsAt: Date; durationMin: number }) {
  return {
    opensAt: new Date(b.startsAt.getTime() - classroomEarlyMin() * 60_000),
    closesAt: new Date(b.startsAt.getTime() + (b.durationMin + CLASSROOM_LATE_MIN) * 60_000),
  };
}
