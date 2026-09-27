/**
 * Sample availability generator for the booking card.
 * Teachers publish hours in their own time zone; we convert every slot to the viewer's zone.
 * Deterministic per teacher + date so the grid is stable between renders.
 */

export type Slot = {
  iso: string;
  instant: number;
  label: string;
  booked: boolean;
};
export type SlotDay = {
  date: string;
  weekday: string;
  dayOfMonth: number;
  slots: Slot[];
};

const TEACHER_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const SLOTS_PER_DAY = 3;
const DAY_MS = 86_400_000;

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(key: string, make: () => Intl.DateTimeFormat) {
  let f = fmtCache.get(key);
  if (!f) {
    f = make();
    fmtCache.set(key, f);
  }
  return f;
}

const partsFmt = (tz: string) =>
  fmt(
    `parts:${tz}`,
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
  );

/** Civil date "YYYY-MM-DD" of an instant in a zone. */
export const civilDate = (instant: number, tz: string) => fmt(`date:${tz}`, () => new Intl.DateTimeFormat("en-CA", { timeZone: tz })).format(instant);

export const timeLabel = (instant: number, tz: string) =>
  fmt(
    `time:${tz}`,
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
  ).format(instant);

export const dayLabel = (instant: number, tz: string) =>
  fmt(
    `day:${tz}`,
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
  ).format(instant);

function offsetMs(instant: number, tz: string) {
  const p = Object.fromEntries(
    partsFmt(tz)
      .formatToParts(instant)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - instant;
}

/** Wall-clock time in `tz` -> UTC instant. */
export function zonedToInstant(civil: string, hour: number, tz: string) {
  const [y, m, d] = civil.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  const off = offsetMs(guess, tz);
  const inst = guess - off;
  const off2 = offsetMs(inst, tz);
  return off2 === off ? inst : guess - off2;
}

const civilToUtcMidnight = (civil: string) => {
  const [y, m, d] = civil.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const addDays = (civil: string, n: number) => new Date(civilToUtcMidnight(civil) + n * DAY_MS).toISOString().slice(0, 10);
const weekdayOf = (civil: string) => new Date(civilToUtcMidnight(civil)).getUTCDay(); // 0 = Sun

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Monday of the first bookable week (next week if today is a weekend). */
export function firstMonday(todayCivil: string) {
  const dow = weekdayOf(todayCivil);
  if (dow === 6) return addDays(todayCivil, 2);
  if (dow === 0) return addDays(todayCivil, 1);
  return addDays(todayCivil, -(dow - 1));
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildWeek({ seed, teacherTz, viewerTz, monday, now }: { seed: string; teacherTz: string; viewerTz: string; monday: string; now: number }): SlotDay[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = addDays(monday, i);
    const candidates: Slot[] = [];
    // A teacher-local day can spill into the previous/next viewer day.
    for (const shift of [-1, 0, 1]) {
      const tDate = addDays(date, shift);
      if (weekdayOf(tDate) === 0) continue; // teachers rest on Sunday (their time)
      const h = hash(`${seed}:${tDate}`);
      const hours = TEACHER_HOURS.filter((_, k) => (h >> k) & 1 || k === h % TEACHER_HOURS.length);
      for (const hour of hours) {
        const instant = zonedToInstant(tDate, hour, teacherTz);
        if (civilDate(instant, viewerTz) !== date) continue;
        candidates.push({
          iso: new Date(instant).toISOString(),
          instant,
          label: timeLabel(instant, viewerTz),
          booked: instant <= now || hash(`${seed}:${instant}`) % 5 === 0,
        });
      }
    }
    candidates.sort((a, b) => a.instant - b.instant);
    // Keep a spread of 3 slots across the day.
    const picked =
      candidates.length <= SLOTS_PER_DAY
        ? candidates
        : Array.from({ length: SLOTS_PER_DAY }, (_, k) => candidates[Math.round((k * (candidates.length - 1)) / (SLOTS_PER_DAY - 1))]);
    return {
      date,
      weekday: WEEKDAYS[weekdayOf(date)],
      dayOfMonth: Number(date.slice(8, 10)),
      slots: picked,
    };
  });
}

export { addDays };

/** Groups API slots (UTC instants) into the 7 viewer-local days starting on `monday`. */
export function groupApiSlots(startsAt: string[], viewerTz: string, monday: string): SlotDay[] {
  const days: SlotDay[] = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = addDays(monday, i);
    return {
      date,
      weekday: WEEKDAYS[weekdayOf(date)],
      dayOfMonth: Number(date.slice(8, 10)),
      slots: [],
    };
  });
  for (const iso of startsAt) {
    const instant = Date.parse(iso);
    const day = days.find((d) => d.date === civilDate(instant, viewerTz));
    day?.slots.push({
      iso: new Date(instant).toISOString(),
      instant,
      label: timeLabel(instant, viewerTz),
      booked: false,
    });
  }
  return days;
}
