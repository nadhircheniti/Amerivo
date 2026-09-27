"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";

type ApiBooking = {
  id: string;
  type: "trial" | "single" | "package";
  status: "pending_payment" | "confirmed";
  startsAt: string;
  durationMin: number;
  withFirstName: string | null;
  withLastName: string | null;
};

/**
 * Real bookings from the API (shown once the site is connected and the student is signed in).
 * The rest of the dashboard still uses sample data until each module is connected.
 */
export function LiveLessons() {
  const { call, isLoaded, isSignedIn } = useApi();
  const booked = useSearchParams().get("booked");
  const [items, setItems] = useState<ApiBooking[] | null>(null);
  const [failed, setFailed] = useState(false);
  const t = useTranslations("student.live");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;

  useEffect(() => {
    if (!API_URL || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<ApiBooking[]>("/bookings")
      .then((rows) => !cancelled && (setItems(rows), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn]);

  if (!API_URL) return null;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
        {items?.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
        {!!items?.length && (
          <ul className="flex flex-col gap-3">
            {items.map((b) => {
              const name = [b.withFirstName, b.withLastName].filter(Boolean).join(" ");
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-beige p-3.5">
                  <span className="font-display text-[15px] font-bold">{fmtDay.format(new Date(b.startsAt))}</span>
                  <span className="text-[15px]">
                    {fmtTime.format(new Date(b.startsAt))}–{fmtTime.format(new Date(new Date(b.startsAt).getTime() + b.durationMin * 60_000))}
                  </span>
                  <span className="text-[15px] text-navy-soft">
                    {name ? t(`withName.${b.type}`, { name }) : t(`withYourTeacher.${b.type}`)}
                  </span>
                  <Badge tone={b.status === "confirmed" ? "success" : "warning"} className="ms-auto">
                    {t(`status.${b.status}`)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted">{t("timeZoneNote", { tz })}</p>
      </section>
    </>
  );
}
