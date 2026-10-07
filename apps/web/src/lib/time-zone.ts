/**
 * Time-zone helpers shared by the student and teacher spaces. Pure (Intl only) so they can be
 * unit-tested. Every instant is stored in UTC by the API; these only decide how it is shown.
 */

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The device's time zone ("UTC" if the browser doesn't say). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Short name of the zone AT THAT INSTANT ("EDT" in October, "EST" in December, "GMT+2" for
 * Zurich in summer). Evaluated at the lesson's date, never "now": Europe and the US change clocks
 * on different weekends, so the gap between them is not always the same.
 */
export function zoneAbbrev(tz: string, at: string | number | Date = Date.now()): string {
  if (!isValidTimeZone(tz)) return tz;
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(at)).find((p) => p.type === "timeZoneName")?.value ?? tz;
}

/** "America/Indiana/Indianapolis" → "Indianapolis", "America/New_York" → "New York". */
export function zoneCity(tz: string): string {
  return (tz.split("/").pop() ?? tz).replace(/_/g, " ");
}

/** "14:00" in `tz` (24-hour clock, in the reader's language). */
export function timeIn(at: string | number | Date, tz: string, tag = "en-US"): string {
  return new Intl.DateTimeFormat(tag, { timeZone: isValidTimeZone(tz) ? tz : "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
}

/** True when both zones show the same wall-clock time at that instant (no need to show it twice). */
export function sameClock(at: string | number | Date, a: string, b: string): boolean {
  return timeIn(at, a) === timeIn(at, b) && dayIn(at, a) === dayIn(at, b);
}

/** Calendar day "2026-10-29" of an instant in a zone. */
export function dayIn(at: string | number | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: isValidTimeZone(tz) ? tz : "UTC" }).format(new Date(at));
}
