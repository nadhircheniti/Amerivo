"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { intlTags, type Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import type { BlockedDate } from "./types";

/** Sample rows (demo mode); `note` is a built-in, translated holiday name. */
type Row = BlockedDate & { note?: "thanksgiving" | "holidays" };

const SAMPLE: Row[] = [
  { id: "thanksgiving", startDate: "2026-11-26", endDate: "2026-11-27", reason: null, note: "thanksgiving" },
  { id: "holidays", startDate: "2026-12-24", endDate: "2027-01-01", reason: null, note: "holidays" },
];

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** Today as "YYYY-MM-DD" in the browser's time zone. */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputClass = "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none";

/**
 * Blocked days. Demo mode (no `live`) keeps the sample rows in memory;
 * live mode adds with POST /teacher/blocked-dates and removes with DELETE /teacher/blocked-dates/:id.
 */
export function BlockedDates({
  live,
}: {
  live?: {
    items: BlockedDate[];
    onAdd: (b: { startDate: string; endDate: string; reason?: string }) => Promise<BlockedDate>;
    onRemove: (id: string) => Promise<void>;
  };
}) {
  const t = useTranslations("teacher.availability.blocked");
  const tag = intlTags[useLocale() as Locale];
  const [items, setItems] = useState<Row[]>(() => live?.items ?? SAMPLE);
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // "add" or the id being removed
  const [error, setError] = useState("");
  const id = useId();

  const label = (b: Row) => {
    const dates =
      b.startDate === b.endDate
        ? new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(day(b.startDate))
        : new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).formatRange(day(b.startDate), day(b.endDate));
    const note = b.note ? t(b.note) : b.reason;
    return note ? t("withNote", { dates, note }) : dates;
  };

  const message = (e: unknown, fallback: string) => (e instanceof ApiError && e.status ? e.message : fallback);
  const endBeforeStart = !!start && !!end && end < start;

  const reset = () => {
    setStart("");
    setEnd("");
    setReason("");
    setAdding(false);
  };

  const add = async () => {
    if (!start || endBeforeStart) return;
    const body = { startDate: start, endDate: end || start, ...(reason.trim() ? { reason: reason.trim() } : {}) };
    setError("");
    if (!live) {
      setItems((list) => [...list, { id: `${body.startDate}-${body.endDate}-${list.length}`, reason: null, ...body }]);
      reset();
      return;
    }
    setBusy("add");
    try {
      const row = await live.onAdd(body);
      setItems((list) => [...list, row]);
      reset();
    } catch (e) {
      setError(message(e, t("addError")));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (b: Row) => {
    setError("");
    if (live) {
      setBusy(b.id);
      try {
        await live.onRemove(b.id);
      } catch (e) {
        setError(message(e, t("removeError")));
        setBusy(null);
        return;
      }
      setBusy(null);
    }
    setItems((list) => list.filter((x) => x.id !== b.id));
  };

  const sorted = [...items].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <section aria-labelledby="blocked-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
      <h2 id="blocked-heading" className="text-[17px] font-bold">
        {t("title")}
      </h2>
      {sorted.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
      <ul className="flex flex-col gap-3">
        {sorted.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-beige py-2 ps-3.5 pe-2 text-sm">
            <span>{label(b)}</span>
            <button
              type="button"
              aria-label={t("remove", { label: label(b) })}
              disabled={busy !== null}
              onClick={() => remove(b)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-navy disabled:opacity-50"
            >
              <Icon name="x" size={16} />
            </button>
          </li>
        ))}
      </ul>

      {error && !adding && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}

      {adding ? (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label htmlFor={`${id}-start`} className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("firstDay")}
              <input
                id={`${id}-start`}
                type="date"
                required
                min={live ? todayIso() : undefined}
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  if (!end || end < e.target.value) setEnd(e.target.value);
                }}
                className={inputClass}
              />
            </label>
            <label htmlFor={`${id}-end`} className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("lastDay")}
              <input
                id={`${id}-end`}
                type="date"
                min={start || undefined}
                value={end}
                aria-invalid={endBeforeStart}
                aria-describedby={endBeforeStart ? `${id}-end-error` : undefined}
                onChange={(e) => setEnd(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          {endBeforeStart && (
            <p id={`${id}-end-error`} className="text-[13px] text-danger-text">
              {t("endBeforeStart")}
            </p>
          )}
          <label htmlFor={`${id}-reason`} className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("reason")}
            <input
              id={`${id}-reason`}
              type="text"
              maxLength={120}
              value={reason}
              placeholder={t("reasonPlaceholder")}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger-text">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="teal" size="sm" className="flex-1" disabled={!start || endBeforeStart || busy === "add"}>
              {busy === "add" ? t("adding") : t("add")}
            </Button>
            <Button
              variant="outlineLight"
              size="sm"
              className="flex-1"
              onClick={() => {
                reset();
                setError("");
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="dashed" className="h-[46px] text-sm" onClick={() => setAdding(true)}>
          {t("blockDate")}
        </Button>
      )}
    </section>
  );
}
