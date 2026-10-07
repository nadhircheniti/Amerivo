"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePolling } from "@/components/messaging/use-polling";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { sameClock, timeIn, zoneAbbrev, zoneCity } from "@/lib/time-zone";
import { useSpaceTimeZone } from "@/lib/use-time-zone";

type ApiBooking = {
  id: string;
  type: "trial" | "single" | "package";
  status: "pending_payment" | "confirmed";
  startsAt: string;
  durationMin: number;
  withFirstName: string | null;
  withLastName: string | null;
  /** The other person's time zone (older API versions don't send it). */
  withTimezone?: string | null;
  /** When the classroom opens / closes (older API versions don't send them). */
  opensAt?: string;
  closesAt?: string;
};

/**
 * Real bookings from the API (shown once the site is connected and the student is signed in).
 * The rest of the dashboard still uses sample data until each module is connected.
 */
export function LiveLessons({ forTeacher = false }: { forTeacher?: boolean } = {}) {
  const { call, isLoaded, isSignedIn } = useApi();
  const booked = useSearchParams().get("booked");
  const [items, setItems] = useState<ApiBooking[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Ticks every 15 s so the classroom button appears when the classroom opens (the API checks it again).
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const t = useTranslations("student.live");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;

  const ready = !!API_URL && isLoaded && !!isSignedIn;
  const loaded = useRef(false);
  const load = useCallback(
    () =>
      call<ApiBooking[]>("/bookings").then(
        (rows) => {
          loaded.current = true;
          setItems(rows);
          setFailed(false);
        },
        // A failed refresh keeps the list already shown (the server may be waking up).
        () => !loaded.current && setFailed(true),
      ),
    [call],
  );
  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);
  // New bookings and lessons that start appear without reloading the page.
  usePolling(() => void load(), 60_000, ready);

  // Same zone as the rest of the space: the teacher's profile zone / the student's account zone.
  const tz = useSpaceTimeZone();
  if (!API_URL) return null;
  const fmtDay = new Intl.DateTimeFormat(intlTags[locale], {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
  const fmtTime = new Intl.DateTimeFormat(intlTags[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });

  return (
    <>
      {booked && (
        <p role="status" className="flex items-center gap-3 rounded-2xl bg-teal-100 px-5 py-4 text-[15px] font-semibold text-teal-deep">
          <Icon name="check" size={20} strokeWidth={2.4} />
          {t("booked")}
        </p>
      )}
      <section className="flex flex-col gap-3.5 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby="my-bookings">
        <h2 id="my-bookings" className="text-[19px] font-bold">
          {t("title")}
        </h2>
        {failed && <p className="text-sm text-orange-text">{t("loadError")}</p>}
        {!failed && items === null && <p className="text-sm text-muted">{tc("loading")}</p>}
        {items?.length === 0 && <p className="text-sm text-muted">{forTeacher ? t("emptyTeacher") : t("empty")}</p>}
        {!!items?.length && (
          <ul className="flex flex-col gap-3">
            {items.map((b) => {
              const name = [b.withFirstName, b.withLastName].filter(Boolean).join(" ");
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-beige p-3.5">
                  <span className="font-display text-[15px] font-bold">{fmtDay.format(new Date(b.startsAt))}</span>
                  <span className="text-[15px]">
                    <bdi dir="ltr">
                      {fmtTime.format(new Date(b.startsAt))}–{fmtTime.format(new Date(new Date(b.startsAt).getTime() + b.durationMin * 60_000))}
                    </bdi>{" "}
                    {/* Zone name as on the lesson's date: EDT/EST, GMT+2/GMT+1… */}
                    <span className="text-[13px] text-muted">{zoneAbbrev(tz, b.startsAt)}</span>
                  </span>
                  {b.withTimezone && b.withFirstName && !sameClock(b.startsAt, tz, b.withTimezone) && (
                    <span className="text-[13px] text-muted">
                      {t("otherTime", { time: timeIn(b.startsAt, b.withTimezone, intlTags[locale]), zone: zoneAbbrev(b.withTimezone, b.startsAt), name: b.withFirstName, city: zoneCity(b.withTimezone) })}
                    </span>
                  )}
                  <span className="text-[15px] text-navy-soft">{name ? t(`withName.${b.type}`, { name }) : t(`withYourTeacher.${b.type}`)}</span>
                  <Badge tone={b.status === "confirmed" ? "success" : "warning"} className="ms-auto">
                    {t(`status.${b.status}`)}
                  </Badge>
                  {b.status === "confirmed" &&
                    (!b.opensAt || clock >= new Date(b.opensAt).getTime() ? (
                      <ButtonLink href={`/classroom/${b.id}`} size="sm" variant="teal">
                        <Icon name="video" size={16} />
                        {t("classroom")}
                      </ButtonLink>
                    ) : (
                      <span className="rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-soft">{t("opensAt", { time: fmtTime.format(new Date(b.opensAt)) })}</span>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted">{t("timeZoneNote", { tz: `${zoneCity(tz)} (${zoneAbbrev(tz)})` })}</p>
      </section>
    </>
  );
}
