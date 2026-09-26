"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Blocked = { id: string; label: string };

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function BlockedDates() {
  const [items, setItems] = useState<Blocked[]>([
    { id: "thanksgiving", label: "Nov 26 – Nov 27 · Thanksgiving" },
    { id: "holidays", label: "Dec 24 – Jan 1 · Holidays" },
  ]);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState("");
  const inputId = useId();

  const add = () => {
    if (!date) return;
    setItems((list) => (list.some((b) => b.id === date) ? list : [...list, { id: date, label: fmt(date) }]));
    setDate("");
    setAdding(false);
  };

  return (
    <section aria-labelledby="blocked-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
      <h2 id="blocked-heading" className="text-[17px] font-bold">
        Blocked dates
      </h2>
      {items.length === 0 && <p className="text-sm text-muted">No blocked dates.</p>}
      <ul className="flex flex-col gap-3">
        {items.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-xl bg-beige py-2 pr-2 pl-3.5 text-sm">
            <span>{b.label}</span>
            <button
              type="button"
              aria-label={`Remove blocked date ${b.label}`}
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
            Date to block
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
              Add
            </Button>
            <Button variant="outlineLight" size="sm" className="flex-1" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="dashed" className="h-[46px] text-sm" onClick={() => setAdding(true)}>
          Block a date
        </Button>
      )}
    </section>
  );
}
