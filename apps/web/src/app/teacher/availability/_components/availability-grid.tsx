"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { intlTags, type Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AvailabilityRule } from "./types";

/** Monday-first week: day index 0 = Monday … 6 = Sunday (API weekday = index + 1). */
const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const FIRST_HOUR = 6;
const LAST_HOUR = 23; // last row 23:00–24:00
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const HOURS = range(FIRST_HOUR, LAST_HOUR);

/** Sample bookings keyed by "dayIndex-hour" (demo mode only). */
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

function useWeekdays() {
  const tag = intlTags[useLocale() as Locale];
  return useMemo(() => [weekdayNames(tag, "short"), weekdayNames(tag, "long")], [tag]);
}

/** Whole hours fully covered by the rules become open cells. */
function rulesToCells(rules: AvailabilityRule[]): OpenMap {
  const open: OpenMap = {};
  for (const r of rules) {
    for (let h = Math.ceil(r.startMinute / 60); (h + 1) * 60 <= r.endMinute; h++) open[`${r.weekday - 1}-${h}`] = true;
  }
  return open;
}

/** Consecutive open hours of a day are merged into one window. */
function cellsToRules(open: OpenMap): AvailabilityRule[] {
  const rules: AvailabilityRule[] = [];
  for (const d of DAYS) {
    let start: number | null = null;
    for (let h = 0; h <= 24; h++) {
      const on = h < 24 && !!open[`${d}-${h}`];
      if (on && start === null) start = h;
      if (!on && start !== null) {
        rules.push({ weekday: d + 1, startMinute: start * 60, endMinute: h * 60 });
        start = null;
      }
    }
  }
  return rules;
}

const signature = (rules: AvailabilityRule[]) =>
  JSON.stringify([...rules].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute).map((r) => [r.weekday, r.startMinute, r.endMinute]));

function Heading({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("teacher.availability.grid");
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 id="availability-heading" className="text-2xl font-extrabold sm:text-[26px]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
      {children}
    </div>
  );
}

function Legend({ showBooked }: { showBooked: boolean }) {
  const t = useTranslations("teacher.availability.grid");
  return (
    <ul className="flex flex-wrap gap-5" aria-label={t("legend")}>
      <li className="flex items-center gap-1.5">
        <span className="size-3.5 rounded bg-teal-200" aria-hidden="true" />
        {t("open")}
      </li>
      {showBooked && (
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-navy" aria-hidden="true" />
          {t("booked")}
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <span className="size-3.5 rounded border border-sand bg-beige" aria-hidden="true" />
        {t("closed")}
      </li>
    </ul>
  );
}

function WeekTable({
  hours,
  open,
  booked = {},
  caption,
  onToggle,
}: {
  hours: number[];
  open: OpenMap;
  booked?: Record<string, string>;
  caption: string;
  onToggle: (key: string) => void;
}) {
  const t = useTranslations("teacher.availability.grid");
  const [short, long] = useWeekdays();
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1">
        <caption className="sr-only">{caption}</caption>
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
          {hours.map((h) => (
            <tr key={h}>
              <th scope="row" className="w-16 text-start text-xs font-normal text-muted">
                {pad(h)}
              </th>
              {DAYS.map((d) => {
                const day = long[d];
                const key = `${d}-${h}`;
                const bookedBy = booked[key];
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
                      onClick={() => onToggle(key)}
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
  );
}

/** Demo mode: sample schedule, nothing is saved. */
export function AvailabilityGrid() {
  const t = useTranslations("teacher.availability.grid");
  const [mode, setMode] = useState<Mode>("recurring");
  const [tz, setTz] = useState(TIME_ZONES[0].value);
  const [slots, setSlots] = useState<Record<Mode, OpenMap>>(() => ({ recurring: initialOpen(), week: initialOpen() }));

  const toggle = (key: string) => setSlots((s) => ({ ...s, [mode]: { ...s[mode], [key]: !s[mode][key] } }));

  return (
    <section aria-labelledby="availability-heading" className="flex min-w-0 grow flex-col gap-[18px] rounded-3xl bg-white p-5 sm:p-[26px]">
      <Heading>
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
      </Heading>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px]">
        <label className="flex items-center gap-2 font-semibold">
          {t("timeZone")}
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="h-10 rounded-[10px] border border-line bg-white px-2.5 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none"
          >
            {TIME_ZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
        <Legend showBooked />
      </div>

      <p className="sr-only" aria-live="polite">
        {mode === "recurring" ? t("liveRecurring") : t("liveWeek")}
      </p>

      <WeekTable hours={HOURS} open={slots[mode]} booked={BOOKED} caption={mode === "recurring" ? t("captionRecurring", { tz }) : t("captionWeek", { tz })} onToggle={toggle} />
    </section>
  );
}

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/** Live mode: the teacher's recurring weekly rules, saved with PUT /teacher/availability. */
export function LiveAvailabilityGrid({ timezone, rules, onSave }: { timezone: string; rules: AvailabilityRule[]; onSave: (rules: AvailabilityRule[]) => Promise<void> }) {
  const t = useTranslations("teacher.availability.grid");
  const [open, setOpen] = useState<OpenMap>(() => rulesToCells(rules));
  const [saved, setSaved] = useState(() => signature(cellsToRules(rulesToCells(rules))));
  const [misaligned, setMisaligned] = useState(() => rules.some((r) => r.startMinute % 60 !== 0 || r.endMinute % 60 !== 0));
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  // Early windows (before 06:00) stay visible and editable.
  const hours = useMemo(() => {
    const earliest = Math.min(FIRST_HOUR, ...rules.map((r) => Math.floor(r.startMinute / 60)));
    return range(earliest, LAST_HOUR);
  }, [rules]);

  const next = cellsToRules(open);
  const dirty = signature(next) !== saved || misaligned;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const toggle = (key: string) => {
    setOpen((o) => ({ ...o, [key]: !o[key] }));
    if (state.kind !== "saving") setState({ kind: "idle" });
  };

  const save = async () => {
    setState({ kind: "saving" });
    try {
      await onSave(next);
      setSaved(signature(next));
      setMisaligned(false);
      setState({ kind: "saved" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof ApiError && e.status ? e.message : t("saveError") });
    }
  };

  return (
    <section aria-labelledby="availability-heading" className="flex min-w-0 grow flex-col gap-[18px] rounded-3xl bg-white p-5 sm:p-[26px]">
      <Heading />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px]">
        <p className="flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-2 text-sm">
          <Icon name="clock" size={16} className="shrink-0 text-teal-dark" />
          <span>{t.rich("yourTimeZone", { strong: (c) => <strong>{c}</strong>, tz: timezone })}</span>
        </p>
        <Legend showBooked={false} />
      </div>

      <p className="text-[13px] leading-normal text-navy-soft">{t("liveHelp")}</p>
      {misaligned && <p className="rounded-xl bg-orange-100 px-3.5 py-2.5 text-[13px] text-orange-text">{t("misaligned")}</p>}

      <WeekTable hours={hours} open={open} caption={t("captionLive", { tz: timezone })} onToggle={toggle} />

      <div className="flex flex-col gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className={cn("text-sm", state.kind === "error" ? "text-danger-text" : state.kind === "saved" ? "font-semibold text-teal-deep" : "text-muted")}>
          {state.kind === "error" ? state.message : state.kind === "saved" ? t("saved") : dirty ? t("unsaved") : next.length === 0 ? t("emptyWarning") : ""}
        </p>
        <Button variant="teal" size="sm" className="shrink-0 px-6" onClick={save} disabled={state.kind === "saving" || !dirty}>
          {state.kind === "saving" ? t("saving") : t("save")}
        </Button>
      </div>
    </section>
  );
}
