/**
 * Bookable slot generation (spec §6, §7).
 * Teachers define weekly windows in THEIR time zone; students see slots converted to THEIR
 * time zone automatically. Blocked dates, vacation mode, existing bookings and a minimum
 * notice period are removed.
 */
import { DateTime, Interval } from "luxon";

export interface Rule {
  weekday: number; // 1 = Monday … 7 = Sunday
  startMinute: number;
  endMinute: number;
}

export interface BlockedRange {
  startDate: string; // yyyy-mm-dd, teacher time zone, inclusive
  endDate: string;
}

export interface Busy {
  startsAt: Date;
  durationMin: number;
}

export interface SlotQuery {
  teacherTz: string;
  viewerTz: string;
  rules: Rule[];
  blocked: BlockedRange[];
  busy: Busy[];
  from: Date; // UTC range to search
  to: Date;
  now: Date;
  durationMin: number; // 50 or 20
  stepMin?: number; // slot granularity, default 60
  minNoticeMin?: number; // default 60
  vacationMode?: boolean;
}

export interface Slot {
  startsAt: string; // ISO UTC
  local: string; // ISO in viewer tz
  teacherLocal: string; // ISO in teacher tz
}

export function generateSlots(q: SlotQuery): Slot[] {
  if (q.vacationMode) return [];
  for (const tz of [q.teacherTz, q.viewerTz]) {
    if (!DateTime.local().setZone(tz).isValid) throw new Error(`Invalid time zone: ${tz}`);
  }
  const step = q.stepMin ?? 60;
  const notice = q.minNoticeMin ?? 60;
  const earliest = DateTime.fromJSDate(q.now).plus({ minutes: notice });
  const busy = q.busy.map((b) =>
    Interval.fromDateTimes(DateTime.fromJSDate(b.startsAt), DateTime.fromJSDate(b.startsAt).plus({ minutes: b.durationMin })),
  );
  const isBlocked = (d: DateTime) => {
    const day = d.toISODate()!;
    return q.blocked.some((b) => day >= b.startDate && day <= b.endDate);
  };

  const out: Slot[] = [];
  let day = DateTime.fromJSDate(q.from, { zone: q.teacherTz }).startOf("day");
  const lastDay = DateTime.fromJSDate(q.to, { zone: q.teacherTz }).endOf("day");
  while (day <= lastDay) {
    if (!isBlocked(day)) {
      for (const r of q.rules.filter((r) => r.weekday === day.weekday)) {
        for (let m = r.startMinute; m + q.durationMin <= r.endMinute; m += step) {
          // Built from wall-clock fields so DST transitions are handled by luxon.
          const start = day.set({ hour: Math.floor(m / 60), minute: m % 60, second: 0, millisecond: 0 });
          if (start.hour * 60 + start.minute !== m) continue; // nonexistent local time (DST gap)
          const end = start.plus({ minutes: q.durationMin });
          if (start < earliest) continue;
          if (start.toJSDate() < q.from || start.toJSDate() > q.to) continue;
          const candidate = Interval.fromDateTimes(start, end);
          if (busy.some((b) => b.overlaps(candidate))) continue;
          out.push({
            startsAt: start.toUTC().toISO()!,
            local: start.setZone(q.viewerTz).toISO()!,
            teacherLocal: start.toISO()!,
          });
        }
      }
    }
    day = day.plus({ days: 1 });
  }
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** True when a requested start time is one of the generated slots. */
export function isSlotAvailable(q: SlotQuery, startsAt: Date) {
  const iso = DateTime.fromJSDate(startsAt).toUTC().toISO();
  return generateSlots({ ...q, from: startsAt, to: startsAt }).some((s) => s.startsAt === iso);
}
