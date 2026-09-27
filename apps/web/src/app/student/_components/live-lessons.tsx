"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/primitives";
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

const TYPE_LABEL: Record<ApiBooking["type"], string> = {
  trial: "Trial lesson",
  single: "Lesson",
  package: "Pack lesson",
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
  const fmtDay = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
  const fmtTime = new Intl.DateTimeFormat("en-US", {
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
          Your lesson is booked! You&apos;ll find it below and receive a confirmation e-mail.
        </p>
      )}
      <section className="flex flex-col gap-3.5 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby="my-bookings">
        <h2 id="my-bookings" className="text-[19px] font-bold">
          My booked lessons
        </h2>
        {failed && <p className="text-sm text-orange-text">We couldn&apos;t load your lessons right now. Please refresh in a minute.</p>}
        {!failed && items === null && <p className="text-sm text-muted">Loading…</p>}
        {items?.length === 0 && <p className="text-sm text-muted">No upcoming lessons yet — pick a teacher and book your first one.</p>}
        {!!items?.length && (
          <ul className="flex flex-col gap-3">
            {items.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-beige p-3.5">
                <span className="font-display text-[15px] font-bold">{fmtDay.format(new Date(b.startsAt))}</span>
                <span className="text-[15px]">
                  {fmtTime.format(new Date(b.startsAt))}–{fmtTime.format(new Date(new Date(b.startsAt).getTime() + b.durationMin * 60_000))}
                </span>
                <span className="text-[15px] text-navy-soft">
                  {TYPE_LABEL[b.type]} with {[b.withFirstName, b.withLastName].filter(Boolean).join(" ") || "your teacher"}
                </span>
                <Badge tone={b.status === "confirmed" ? "success" : "warning"} className="ml-auto">
                  {b.status === "confirmed" ? "Confirmed" : "Awaiting payment"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">Times shown in your time zone ({tz}).</p>
      </section>
    </>
  );
}
