"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Segmented } from "@/components/ui/form";
import { intlTags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

/** Monday-first week: day index 0 = Monday … 6 = Sunday. */
const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i); // 07:00 – 20:00

/** Sample bookings keyed by "dayIndex-hour". */
const BOOKED: Record<string, string> = {
  "2-11": "Maria S.",
  "2-17": "Lucas M.",
  "0-9": "Ana C.",
  "3-18": "Maria S.",
  "1-10": "Kenji T.",
};

const TIME_ZONES = [
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
];

type Mode = "recurring" | "week";
type OpenMap = Record<string, boolean>;

function initialOpen(): OpenMap {
  const open: OpenMap = {};
  for (let d = 0; d < 5; d++) {
    for (let h = 9; h < 13; h++) open[`${d}-${h}`] = true;
    for (let h = 16; h < 19; h++) open[`${d}-${h}`] = true;
  }
  open["5-10"] = true;
  open["5-11"] = true;
  return open;
}

const pad = (h: number) => `${h < 10 ? "0" : ""}${h}:00`;

/** Weekday names for the locale (2024-01-01 was a Monday). */
function weekdayNames(tag: string, weekday: "short" | "long") {
  const f = new Intl.DateTimeFormat(tag, { weekday, timeZone: "UTC" });
  return DAYS.map((d) => f.format(new Date(Date.UTC(2024, 0, 1 + d))));
}

export function AvailabilityGrid() {
  const t = useTranslations("teacher.availability.grid");
  const tag = intlTags[useLocale() as Locale];
  const [short, long] = useMemo(() => [weekdayNames(tag, "short"), weekdayNames(tag, "long")], [tag]);
  const [mode, setMode] = useState<Mode>("recurring");
  const [tz, setTz] = useState(TIME_ZONES[0].value);
  const [slots, setSlots] = useState<Record<Mode, OpenMap>>(() => ({ recurring: initialOpen(), week: initialOpen() }));
  const open = slots[mode];

  const toggle = (key: string) =>
    setSlots((s) => ({ ...s, [mode]: { ...s[mode], [key]: !s[mode][key] } }));

  return (
    <section aria-labelledby="availability-heading" className="flex min-w-0 grow flex-col gap-[18px] rounded-3xl bg-white p-5 sm:p-[26px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 id="availability-heading" className="text-2xl font-extrabold sm:text-[26px]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <Segmented
          label={t("scopeLabel")}
          value={mode}
          onChange={setMode}
          className="shrink-0 rounded-xl p-1 [&>button]:h-[42px] [&>button]:rounded-[9px] [&>button]:text-sm"
          options={[
            { value: "recurring", label: t("recurring") },
            { value: "week", label: t("thisWeek") },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px]">
        <label className="flex items-center gap-2 font-semibold">
          {t("timeZone")}
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="h-10 rounded-[10px] border border-line bg-white px-2.5 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none"
          >
            {TIME_ZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <ul className="flex flex-wrap gap-5" aria-label={t("legend")}>
          <li className="flex items-center gap-1.5">
            <span className="size-3.5 rounded bg-teal-200" aria-hidden="true" />
            {t("open")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3.5 rounded bg-navy" aria-hidden="true" />
            {t("booked")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3.5 rounded border border-sand bg-beige" aria-hidden="true" />
            {t("closed")}
          </li>
        </ul>
      </div>

      <p className="sr-only" aria-live="polite">
        {mode === "recurring" ? t("liveRecurring") : t("liveWeek")}
      </p>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1">
          <caption className="sr-only">
            {mode === "recurring" ? t("captionRecurring", { tz }) : t("captionWeek", { tz })}
          </caption>
          <thead>
            <tr>
              <td className="w-16" />
              {DAYS.map((d) => (
                <th key={d} scope="col" className="pb-1.5 text-center text-[13px] font-semibold">
                  <abbr title={long[d]} className="no-underline">
                    {short[d]}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <th scope="row" className="w-16 text-start text-xs font-normal text-muted">
                  {pad(h)}
                </th>
                {DAYS.map((d) => {
                  const day = long[d];
                  const key = `${d}-${h}`;
                  const bookedBy = BOOKED[key];
                  const isOpen = !!open[key];
                  if (bookedBy) {
                    return (
                      <td key={key} className="p-0">
                        <button
                          type="button"
                          aria-disabled="true"
                          aria-label={t("slotBooked", { day, time: pad(h), name: bookedBy })}
                          className="h-9 w-full cursor-not-allowed overflow-hidden rounded-md bg-navy px-1 text-[11px] font-semibold whitespace-nowrap text-white"
                        >
                          {bookedBy}
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td key={key} className="p-0">
                      <button
                        type="button"
                        aria-pressed={isOpen}
                        aria-label={t(isOpen ? "slotOpen" : "slotClosed", { day, time: pad(h) })}
                        onClick={() => toggle(key)}
                        className={cn(
                          "h-9 w-full rounded-md border transition-colors",
                          isOpen ? "border-teal bg-teal-200 hover:bg-teal-100" : "border-line-soft bg-beige hover:bg-teal-50",
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
