"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChoiceTile } from "@/components/ui/form";
import { formatUsd, packagePrice } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { shortUsd } from "../../../_components/tone";
import { API_URL, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { intlTags } from "@/i18n/config";
import { addDays, buildWeek, civilDate, dayLabel, firstMonday, groupApiSlots, timeLabel, zonedToInstant, type SlotDay } from "./slots";

type LessonType = "trial" | "single" | "pack5" | "pack10" | "package";
/** A package the student already paid for, with lessons left to book with this teacher. */
type MyPackage = { id: string; lessonCount: number; remaining: number };
const WEEKS_AHEAD = 4;

const noopSubscribe = () => () => {};

const HOUR_MS = 3_600_000;

/**
 * Viewer's zone, today's date there and the current hour, read on the client only
 * (the server renders a neutral loading state). Returned as a string so the snapshot stays stable.
 */
function useViewerClockSnapshot() {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const now = Date.now();
      return `${tz}|${civilDate(now, tz)}|${Math.floor(now / HOUR_MS)}`;
    },
    () => null,
  );
}

/** `?type=trial` from the teacher list pre-selects the free trial (only if the teacher offers one). */
function useQueryType(): LessonType | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const t = new URLSearchParams(window.location.search).get("type");
      return t === "trial" || t === "single" || t === "pack5" || t === "pack10" || t === "package" ? t : null;
    },
    () => null,
  );
}

/** Signed-in student: their package with this teacher that still has lessons to book (oldest first). */
function useMyPackage(slug: string) {
  const { call, isLoaded, isSignedIn } = useApi();
  const [pkg, setPkg] = useState<MyPackage | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!API_URL || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<MyPackage[]>(`/student/packages?${new URLSearchParams({ teacher: slug })}`).then(
      (rows) => !cancelled && setPkg(rows[0] ?? null),
      () => undefined, // not a student (teacher/admin viewing the page) or the API is waking up
    );
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn, slug, nonce]);
  return { pkg, refresh: () => setNonce((n) => n + 1) };
}

export function BookingCard({
  slug,
  firstName,
  priceUsd,
  offersTrial,
  offersPack5,
  offersPack10,
  teacherTimezone,
}: {
  slug: string;
  firstName: string;
  priceUsd: number;
  offersTrial: boolean;
  offersPack5: boolean;
  offersPack10: boolean;
  teacherTimezone: string;
}) {
  const t = useTranslations("marketing.booking");
  const locale = useLocale();
  const tag = intlTags[locale];
  const ids = useId();
  const clockSnap = useViewerClockSnapshot();
  const clock = useMemo(() => {
    if (!clockSnap) return null;
    const [tz, today, hour] = clockSnap.split("|");
    return { tz, today, now: (Number(hour) + 1) * HOUR_MS }; // no bookings within the coming hour
  }, [clockSnap]);
  const queryType = useQueryType();
  const [chosenType, setChosenType] = useState<LessonType | null>(null);
  const [week, setWeek] = useState(0);
  const [slot, setSlot] = useState<{ iso: string; instant: number } | null>(null);

  const { pkg } = useMyPackage(slug);
  const { call } = useApi();
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const options = [
    // Lessons already paid in a package come first: booking one costs nothing more.
    ...(pkg ? [{ value: "package" as const, label: t("usePackage", { count: pkg.remaining }), price: 0, included: true }] : []),
    ...(offersTrial ? [{ value: "trial" as const, label: t("trial"), price: 0 }] : []),
    {
      value: "single" as const,
      label: t("single"),
      price: priceUsd,
    },
    ...(offersPack5
      ? [
          {
            value: "pack5" as const,
            label: t("pack5"),
            discount: "−5%",
            price: packagePrice(priceUsd, 5),
          },
        ]
      : []),
    ...(offersPack10
      ? [
          {
            value: "pack10" as const,
            label: t("pack10"),
            discount: "−10%",
            price: packagePrice(priceUsd, 10),
          },
        ]
      : []),
  ];
  const requested = chosenType ?? queryType ?? (pkg ? "package" : "single");
  const type = options.some((o) => o.value === requested) ? requested : "single";
  const current = options.find((o) => o.value === type)!;
  const duration = type === "trial" ? 20 : 50;

  const monday = clock ? addDays(firstMonday(clock.today), week * 7) : null;
  const demoDays = useMemo(() => {
    if (!clock || !monday || API_URL) return null;
    return buildWeek({
      seed: slug,
      teacherTz: teacherTimezone,
      viewerTz: clock.tz,
      monday,
      now: clock.now,
      tag,
    });
  }, [clock, monday, slug, teacherTimezone, tag]);
  const live = useLiveSlots(slug, clock?.tz ?? null, monday, type === "trial", tag);
  const days = API_URL ? live.days : demoDays;

  const weekRange = days ? `${shortDate(days[0].date, tag)} – ${shortDate(days[6].date, tag)}` : "";

  const summary =
    slot && clock ? `${dayLabel(slot.instant, clock.tz, tag)} · \u2066${timeLabel(slot.instant, clock.tz)}–${timeLabel(slot.instant + duration * 60_000, clock.tz)}\u2069` : null;

  const checkoutHref = slot && clock ? `/checkout?${new URLSearchParams({ teacher: slug, type, slot: slot.iso, tz: clock.tz }).toString()}` : null;

  return (
    <aside
      id="book"
      aria-labelledby={`${ids}-title`}
      className="flex w-full shrink-0 flex-col gap-[22px] rounded-3xl bg-white p-6 shadow-float sm:p-7 lg:sticky lg:top-6 lg:w-[440px]"
    >
      <h2 id={`${ids}-title`} className="sr-only">
        {t("title", { name: firstName })}
      </h2>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-display text-[34px] font-extrabold">{shortUsd(priceUsd, locale)}</p>
        <span className="text-sm text-muted">{t("perLesson")}</span>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 font-display text-[15px] font-bold">{t("lessonType")}</legend>
        {options.map((o) => (
          <ChoiceTile
            key={o.value}
            type="radio"
            name={`${ids}-type`}
            checked={type === o.value}
            onChange={(checked) => checked && setChosenType(o.value)}
            className="rounded-[14px] px-4 text-[15px]"
          >
            <span className="flex flex-1 items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                {o.label}
                {"discount" in o && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-normal">{o.discount}</span>}
              </span>
              <strong className="shrink-0">{"included" in o ? t("included") : o.price === 0 ? t("free") : shortUsd(o.price, locale)}</strong>
            </span>
          </ChoiceTile>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3" role="group" aria-labelledby={`${ids}-pick`}>
        <div className="flex items-center justify-between gap-3">
          <h3 id={`${ids}-pick`} className="text-[15px] font-bold">
            {t("pickTime")} {weekRange && <span className="ms-1 font-sans text-[13px] font-normal text-muted">{weekRange}</span>}
          </h3>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label={t("previousWeek")}
              disabled={week === 0}
              onClick={() => setWeek((w) => Math.max(0, w - 1))}
              className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-white text-navy hover:bg-beige disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <button
              type="button"
              aria-label={t("nextWeek")}
              disabled={week >= WEEKS_AHEAD - 1}
              onClick={() => setWeek((w) => Math.min(WEEKS_AHEAD - 1, w + 1))}
              className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-white text-navy hover:bg-beige disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <Icon name="globe" size={14} strokeWidth={2} />
          {clock ? t("timezone", { tz: clock.tz }) : t("detecting")}
        </p>

        {live.error && (
          <p role="status" className="rounded-[10px] bg-cream px-3 py-2 text-[13px] text-orange-text">
            {t(live.error)}
          </p>
        )}
        {days && days.every((d) => d.slots.length === 0) && !live.error && <p className="text-[13px] text-muted">{t("noSlots")}</p>}
        <div className="grid grid-cols-7 gap-1 text-center" aria-live="polite">
          {days
            ? days.map((d) => (
                <div key={d.date} role="group" aria-label={dayLabel(Date.parse(`${d.date}T12:00:00Z`), "UTC", tag)} className="flex flex-col gap-1.5">
                  <div className="text-xs text-muted" aria-hidden="true">
                    {d.weekday}
                    <br />
                    <strong className="text-[15px] text-navy">{d.dayOfMonth}</strong>
                  </div>
                  {d.slots.length === 0 && <span className="py-2.5 text-xs text-muted">—</span>}
                  {d.slots.map((s) => {
                    const selected = slot?.iso === s.iso;
                    return (
                      <button
                        key={s.iso}
                        type="button"
                        disabled={s.booked}
                        aria-pressed={selected}
                        aria-label={s.booked ? t("unavailable", { time: s.label }) : s.label}
                        onClick={() => setSlot({ iso: s.iso, instant: s.instant })}
                        className={cn(
                          "h-10 rounded-[10px] text-[12px] tabular-nums",
                          s.booked
                            ? "cursor-not-allowed bg-beige-2 text-muted line-through"
                            : selected
                              ? "bg-navy font-semibold text-white"
                              : "border border-line bg-white text-navy hover:border-teal-dark hover:bg-teal-50",
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              ))
            : Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex flex-col gap-1.5" aria-hidden="true">
                  <div className="h-[38px]" />
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="h-10 animate-pulse rounded-[10px] bg-beige" />
                  ))}
                </div>
              ))}
        </div>
      </div>

      <div className="flex justify-between gap-3 rounded-[14px] bg-beige px-4 py-3.5 text-sm" aria-live="polite">
        <span>{summary ?? t("selectTime")}</span>
        <strong className="shrink-0">{type === "package" ? t("included") : current.price === 0 ? t("free") : formatUsd(current.price, locale)}</strong>
      </div>

      {bookError && (
        <p role="alert" className="rounded-[10px] bg-danger-100 px-3 py-2 text-sm text-danger-text">
          {bookError}
        </p>
      )}
      {type === "package" && pkg ? (
        // From the package: booked at once, no checkout (the lesson is already paid).
        <Button
          size="lg"
          className="w-full"
          disabled={!slot || booking}
          onClick={async () => {
            if (!slot) return;
            setBooking(true);
            setBookError(null);
            try {
              const res = await call<{ booking: { id: string } }>("/bookings", {
                method: "POST",
                body: JSON.stringify({ teacherSlug: slug, offer: "from_package", packageId: pkg.id, startsAt: slot.iso }),
              });
              router.push(`/student?booked=${res.booking.id}`);
            } catch (e) {
              setBookError(e instanceof ApiError && e.message ? e.message : t("bookError"));
              setBooking(false);
            }
          }}
        >
          {booking ? t("booking") : t("bookFromPackage")}
        </Button>
      ) : checkoutHref ? (
        <ButtonLink href={checkoutHref} size="lg" className="w-full">
          {t("continue")}
        </ButtonLink>
      ) : (
        <Button size="lg" className="w-full" disabled>
          {t("continue")}
        </Button>
      )}
      <Link href={`/student/messages?${new URLSearchParams({ with: slug })}`} className="flex items-center justify-center gap-2 text-[15px] font-semibold text-teal-dark hover:text-navy">
        <Icon name="message" size={18} />
        {t("message", { name: firstName })}
      </Link>
      <p className="text-center text-[13px] leading-normal text-muted">{t("cancellation")}</p>
    </aside>
  );
}

/** "2026-10-14" -> "Oct 14" (in the visitor's language) */
function shortDate(civil: string, tag: string) {
  return new Date(`${civil}T12:00:00Z`).toLocaleDateString(tag, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Loads the teacher's real free slots for one week from the API (already converted to the
 * viewer's time zone). The free Render plan may take up to a minute to wake up: we show the
 * loading grid meanwhile and a retry message if it fails.
 */
function useLiveSlots(slug: string, tz: string | null, monday: string | null, trial: boolean, tag: string) {
  const [state, setState] = useState<{
    key: string;
    days: SlotDay[] | null;
    /** Message key in marketing.booking */
    error: "loadError" | null;
  }>({ key: "", days: null, error: null });
  const key = `${slug}|${tz}|${monday}|${trial}|${tag}`;

  useEffect(() => {
    if (!API_URL || !tz || !monday) return;
    const from = new Date(zonedToInstant(monday, 0, tz)).toISOString();
    const to = new Date(zonedToInstant(addDays(monday, 7), 0, tz) - 1).toISOString();
    const ctrl = new AbortController();
    const qs = new URLSearchParams({
      from,
      to,
      tz,
      ...(trial ? { trial: "1" } : {}),
    });
    fetch(`${API_URL}/teachers/${encodeURIComponent(slug)}/slots?${qs}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const slots = (await r.json()) as { startsAt: string }[];
        setState({
          key,
          days: groupApiSlots(
            slots.map((s) => s.startsAt),
            tz,
            monday,
            tag,
          ),
          error: null,
        });
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setState({
          key,
          days: null,
          error: "loadError",
        });
      });
    return () => ctrl.abort();
  }, [key, slug, tz, monday, trial, tag]);

  return state.key === key ? state : { key, days: null, error: null };
}
