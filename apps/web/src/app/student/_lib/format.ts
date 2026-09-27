"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
import { useMe } from "@/components/layout/role-gate";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { currentStudent, formatUsd } from "@/lib/mock-data";
import type { TeacherRef } from "./types";

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

/**
 * The student's time zone from their account (GET /me, loaded by the RoleGate); the device's
 * time zone when unknown; the sample student's in demo mode.
 */
export function useStudentTz() {
  const me = useMe() as { timezone?: string } | null;
  if (me?.timezone) return me.timezone;
  return API_URL ? undefined : currentStudent.timezone;
}

export const fullName = (t: Pick<TeacherRef, "firstName" | "lastName"> | null | undefined) => (t ? `${t.firstName} ${t.lastName}`.trim() : "");
export const initials = (t: Pick<TeacherRef, "firstName" | "lastName">) => `${t.firstName.charAt(0)}${t.lastName.charAt(0)}`.toUpperCase();

/** Locale-aware formatters. Instants are shown in `timeZone` (default: the student's, else the device's). */
export function useFormat(timeZone?: string) {
  const locale = useLocale() as Locale;
  const studentTz = useStudentTz();
  const zone = timeZone || studentTz;
  return useMemo(() => {
    const tag = intlTags[locale];
    let tz = zone || browserTimeZone();
    try {
      new Intl.DateTimeFormat(tag, { timeZone: tz });
    } catch {
      tz = "UTC";
    }
    const f = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { timeZone: tz, ...opts });
    const time = f({ hour: "2-digit", minute: "2-digit", hour12: false });
    const dayShort = f({ weekday: "short", month: "short", day: "numeric" });
    const dayLong = f({ weekday: "long", month: "long", day: "numeric" });
    const date = f({ year: "numeric", month: "short", day: "numeric" });
    const weekday = f({ weekday: "short" });
    const dayOfMonth = f({ day: "numeric" });
    const monthShort = f({ month: "short" });
    return {
      locale,
      tag,
      tz,
      time: (iso: string | number | Date) => time.format(new Date(iso)),
      range: (start: string | number | Date, end: string | number | Date) => `${time.format(new Date(start))}–${time.format(new Date(end))}`,
      dayShort: (iso: string | number | Date) => dayShort.format(new Date(iso)),
      dayLong: (iso: string | number | Date) => dayLong.format(new Date(iso)),
      date: (iso: string | number | Date) => date.format(new Date(iso)),
      weekday: (iso: string | number | Date) => weekday.format(new Date(iso)),
      dayOfMonth: (iso: string | number | Date) => dayOfMonth.format(new Date(iso)),
      monthShort: (iso: string | number | Date) => monthShort.format(new Date(iso)),
      /** A calendar day ("2026-10-15"), never shifted by time zones. */
      calendarDay: (ymd: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
        new Intl.DateTimeFormat(tag, { ...opts, timeZone: "UTC" }).format(new Date(`${ymd.slice(0, 10)}T12:00:00Z`)),
      month: (ym: string, opts: Intl.DateTimeFormatOptions = { month: "short" }) => new Intl.DateTimeFormat(tag, { ...opts, timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`)),
      num: (n: number, digits?: number) => n.toLocaleString(tag, digits === undefined ? undefined : { maximumFractionDigits: digits }),
      money: (cents: number) => formatUsd(cents / 100, locale),
      /** Hour of the day (0–23) in the time zone, for greetings. */
      hourNow: () => Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date())),
    };
  }, [locale, zone]);
}
