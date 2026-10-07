"use client";

import { useMe } from "@/components/layout/role-gate";
import { deviceTimeZone, isValidTimeZone } from "./time-zone";

/**
 * The time zone a signed-in person's lessons are shown in:
 * - teacher: the zone of their teaching profile (the one their availability is set in),
 * - student: the zone of their account (Settings),
 * - otherwise (loading, demo, invalid value): the device's.
 * Using it everywhere keeps one lesson at the same time on every screen.
 */
export function useSpaceTimeZone(): string {
  const me = useMe();
  const tz = me?.role === "teacher" ? (me.teacherTimezone ?? me.timezone) : me?.timezone;
  return isValidTimeZone(tz) ? tz : deviceTimeZone();
}
