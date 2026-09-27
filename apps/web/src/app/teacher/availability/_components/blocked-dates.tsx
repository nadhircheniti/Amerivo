"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { intlTags, type Locale } from "@/i18n/config";

/** A blocked day or range of days (yyyy-mm-dd), with an optional built-in holiday name. */
type Blocked = { id: string; from: string; to?: string; note?: "thanksgiving" | "holidays" };

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

export function BlockedDates() {
  const t = useTranslations("teacher.availability.blocked");
  const tag = intlTags[useLocale() as Locale];
  const [items, setItems] = useState<Blocked[]>([
    { id: "thanksgiving", from: "2026-11-26", to: "2026-11-27", note: "thanksgiving" },
    { id: "holidays", from: "2026-12-24", to: "2027-01-01", note: "holidays" },
  ]);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState("");
  const inputId = useId();

  const label = (b: Blocked) => {
    if (!b.to) return new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(day(b.from));
    const dates = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }).formatRange(day(b.from), day(b.to));
    return b.note ? t("withNote", { dates, note: t(b.note) }) : dates;
  };

  const add = () => {
    if (!date) return;
    setItems((list) => (list.some((b) => b.id === date) ? list : [...list, { id: date, from: date }]));
    setDate("");
    setAdding(false);
  };

  return (
    <section aria-labelledby="blocked-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
      <h2 id="blocked-heading" className="text-[17px] font-bold">
        {t("title")}
      </h2>
      {items.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-xl bg-beige py-2 ps-3.5 pe-2 text-sm">
            <span>{label(b)}</span>
            <button
              type="button"
              aria-label={t("remove", { label: label(b) })}
              onClick={() => setItems((list) => list.filter((x) => x.id !== b.id))}
              className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-white hover:text-navy"
            >
              <Icon name="x" size={16} />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label htmlFor={inputId} className="text-sm font-semibold">
            {t("dateToBlock")}
          </label>
          <input
            id={inputId}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-xl border border-line bg-white px-3 text-sm text-navy focus:border-teal-dark focus:outline-none"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="teal" size="sm" className="flex-1" disabled={!date}>
              {t("add")}
            </Button>
            <Button variant="outlineLight" size="sm" className="flex-1" onClick={() => setAdding(false)}>
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
