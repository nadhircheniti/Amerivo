"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChoiceTile } from "@/components/ui/form";
import { formatUsd, packagePrice } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { shortUsd } from "../../../_components/tone";
import { addDays, buildWeek, civilDate, dayLabel, firstMonday, timeLabel } from "./slots";

type LessonType = "trial" | "single" | "pack5" | "pack10";
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

/** `?type=trial` from the teacher list pre-selects the free trial. */
function useQueryType(): LessonType | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const t = new URLSearchParams(window.location.search).get("type");
      return t === "trial" || t === "single" || t === "pack5" || t === "pack10" ? t : null;
    },
    () => null,
  );
}

export function BookingCard({
  slug,
  firstName,
  priceUsd,
  offersPack5,
  offersPack10,
  teacherTimezone,
}: {
  slug: string;
  firstName: string;
  priceUsd: number;
  offersPack5: boolean;
  offersPack10: boolean;
  teacherTimezone: string;
}) {
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

  const options = [
    { value: "trial" as const, label: "Trial lesson · 20 min", price: 0 },
    { value: "single" as const, label: "Single lesson · 50 min", price: priceUsd },
    ...(offersPack5 ? [{ value: "pack5" as const, label: "5 lessons", discount: "−5%", price: packagePrice(priceUsd, 5) }] : []),
    ...(offersPack10 ? [{ value: "pack10" as const, label: "10 lessons", discount: "−10%", price: packagePrice(priceUsd, 10) }] : []),
  ];
  const requested = chosenType ?? queryType ?? "single";
  const type = options.some((o) => o.value === requested) ? requested : "single";
  const current = options.find((o) => o.value === type)!;
  const duration = type === "trial" ? 20 : 50;

  const days = useMemo(() => {
    if (!clock) return null;
    const monday = addDays(firstMonday(clock.today), week * 7);
    return buildWeek({ seed: slug, teacherTz: teacherTimezone, viewerTz: clock.tz, monday, now: clock.now });
  }, [clock, week, slug, teacherTimezone]);

  const weekRange = days ? `${shortDate(days[0].date)} – ${shortDate(days[4].date)}` : "";

  const summary =
    slot && clock
      ? `${dayLabel(slot.instant, clock.tz)} · ${timeLabel(slot.instant, clock.tz)}–${timeLabel(slot.instant + duration * 60_000, clock.tz)}`
      : null;

  const checkoutHref = slot ? `/checkout?${new URLSearchParams({ teacher: slug, type, slot: slot.iso }).toString()}` : null;

  return (
    <aside
      id="book"
      aria-labelledby={`${ids}-title`}
      className="flex w-full shrink-0 flex-col gap-[22px] rounded-3xl bg-white p-6 shadow-float sm:p-7 lg:sticky lg:top-6 lg:w-[440px]"
    >
      <h2 id={`${ids}-title`} className="sr-only">
        Book a lesson with {firstName}
      </h2>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[34px] font-extrabold">${priceUsd}</p>
        <span className="text-sm text-muted">per 50-min lesson</span>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 font-display text-[15px] font-bold">Lesson type</legend>
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
              <strong>{o.price === 0 ? "Free" : shortUsd(o.price)}</strong>
            </span>
          </ChoiceTile>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3" role="group" aria-labelledby={`${ids}-pick`}>
        <div className="flex items-center justify-between gap-3">
          <h3 id={`${ids}-pick`} className="text-[15px] font-bold">
            Pick a time {weekRange && <span className="ml-1 font-sans text-[13px] font-normal text-muted">{weekRange}</span>}
          </h3>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Previous week"
              disabled={week === 0}
              onClick={() => setWeek((w) => Math.max(0, w - 1))}
              className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-white text-navy hover:bg-beige disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <button
              type="button"
              aria-label="Next week"
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
          {clock ? `Times shown in your time zone: ${clock.tz} (auto-detected)` : "Detecting your time zone…"}
        </p>

        <div className="grid grid-cols-5 gap-1.5 text-center" aria-live="polite">
          {days
            ? days.map((d) => (
                <div key={d.date} role="group" aria-label={dayLabel(Date.parse(`${d.date}T12:00:00Z`), "UTC")} className="flex flex-col gap-1.5">
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
                        aria-label={`${s.label}${s.booked ? ", unavailable" : ""}`}
                        onClick={() => setSlot({ iso: s.iso, instant: s.instant })}
                        className={cn(
                          "h-10 rounded-[10px] text-[13px]",
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
            : Array.from({ length: 5 }, (_, i) => (
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
        <span>{summary ?? "Select a time to continue"}</span>
        <strong>{current.price === 0 ? "Free" : formatUsd(current.price)}</strong>
      </div>

      {checkoutHref ? (
        <ButtonLink href={checkoutHref} size="lg" className="w-full">
          Continue to payment
        </ButtonLink>
      ) : (
        <Button size="lg" className="w-full" disabled>
          Continue to payment
        </Button>
      )}
      <Link href="/student/messages" className="flex items-center justify-center gap-2 text-[15px] font-semibold text-teal-dark hover:text-navy">
        <Icon name="message" size={18} />
        Message {firstName}
      </Link>
      <p className="text-center text-[13px] leading-normal text-muted">Free cancellation up to 24 hours before the lesson.</p>
    </aside>
  );
}

/** "2026-10-14" -> "Oct 14" */
function shortDate(civil: string) {
  return new Date(`${civil}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
