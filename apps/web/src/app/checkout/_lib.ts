import { intlTags, type Locale } from "@/i18n/config";
import { packagePrice, type Teacher } from "@/lib/mock-data";

export type LessonType = "trial" | "single" | "pack5" | "pack10";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Sample data has no year in the slot string; the booking API will send an ISO timestamp instead.
const SAMPLE_YEAR = 2026;

/** Offset (ms) between wall-clock time in `tz` and UTC at instant `ts`. */
function tzOffset(ts: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(ts);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - Math.floor(ts / 60000) * 60000;
}

function zonedToUtc(y: number, m: number, d: number, h: number, min: number, tz: string) {
  const guess = Date.UTC(y, m, d, h, min);
  let utc = guess - tzOffset(guess, tz);
  const second = guess - tzOffset(utc, tz);
  if (second !== utc) utc = second;
  return new Date(utc);
}

const fmtDate = (d: Date, tz: string, locale: Locale) =>
  d.toLocaleDateString(intlTags[locale], {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const fmtTime = (d: Date, tz: string, locale: Locale) =>
  d.toLocaleTimeString(intlTags[locale], {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

/**
 * Parses a slot like "Wed, Oct 14 · 18:00" (student's local time) and returns
 * display strings (in `locale`) for both the student's and the teacher's time zone.
 * `teacherDate` is only set when the teacher's calendar day differs from the student's.
 */
export function describeSlot(slot: string, studentTz: string, teacherTz: string, locale: Locale = "en") {
  // Booking card sends an ISO UTC instant (…Z); older sample links use "Wed, Oct 14 · 18:00".
  const iso = /^\d{4}-\d{2}-\d{2}T/.test(slot) ? new Date(slot) : null;
  const m = iso ? null : /^\s*\w{3},\s*(\w{3})\s+(\d{1,2})\s*·\s*(\d{1,2}):(\d{2})\s*$/.exec(slot);
  const month = m ? MONTHS.indexOf(m[1]) : -1;
  if (!iso && (!m || month < 0)) return { date: slot, studentTime: "", teacherDate: null, teacherTime: "", iso: null };
  const instant = iso && !Number.isNaN(iso.getTime()) ? iso : zonedToUtc(SAMPLE_YEAR, month, Number(m![2]), Number(m![3]), Number(m![4]), studentTz);
  const studentDate = fmtDate(instant, studentTz, locale);
  const teacherDate = fmtDate(instant, teacherTz, locale);
  return {
    date: studentDate,
    studentTime: fmtTime(instant, studentTz, locale),
    teacherDate: teacherDate !== studentDate ? teacherDate : null,
    teacherTime: fmtTime(instant, teacherTz, locale),
    iso: instant.toISOString(),
  };
}

/** Price breakdown of an order. The page labels it with t(`order.${type}`) (checkout namespace). */
export function describeOrder(teacher: Teacher, requested: LessonType) {
  // Trial and packs are opt-in per teacher; fall back to a single lesson if the teacher doesn't offer it.
  const type: LessonType =
    (requested === "trial" && !teacher.offersTrial) || (requested === "pack5" && !teacher.offersPack5) || (requested === "pack10" && !teacher.offersPack10) ? "single" : requested;
  const unit = teacher.priceUsd;
  switch (type) {
    case "trial":
      return {
        type,
        count: 1,
        subtotal: 0,
        discount: 0,
        total: 0,
      };
    case "pack5":
      return {
        type,
        count: 5,
        subtotal: unit * 5,
        discount: unit * 5 - packagePrice(unit, 5),
        total: packagePrice(unit, 5),
      };
    case "pack10":
      return {
        type,
        count: 10,
        subtotal: unit * 10,
        discount: unit * 10 - packagePrice(unit, 10),
        total: packagePrice(unit, 10),
      };
    default:
      return {
        type,
        count: 1,
        subtotal: unit,
        discount: 0,
        total: packagePrice(unit, 1),
      };
  }
}

export const isLessonType = (v: unknown): v is LessonType => v === "trial" || v === "single" || v === "pack5" || v === "pack10";
