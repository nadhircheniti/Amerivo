"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/mock-data";
import type { AdminBooking, BookingStatus, DisputeStatus, PaymentStatus, PayoutStatus, UserStatus } from "./types";
import { errorText, isLive } from "./use-admin-data";

/* ---------- Table classes (same look as the overview bookings table) ---------- */
export const th = "border-b border-line-soft px-3 py-2.5 text-start text-[13px] font-semibold whitespace-nowrap text-muted";
export const td = "border-b border-beige-2 px-3 py-[13px] text-sm whitespace-nowrap";
export const linkAction = "font-semibold text-teal-dark hover:text-navy disabled:cursor-not-allowed disabled:opacity-50";
export const control = "h-11 rounded-[10px] border border-line bg-white px-3 text-sm text-navy focus:border-teal-dark focus:outline-none";
export const panel = "flex min-w-0 flex-col gap-3 rounded-[20px] bg-white p-5 sm:p-[22px]";

/* ---------- Formatting ---------- */
export function useFormat() {
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const day = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return {
    locale,
    money: (cents: number) => formatUsd(cents / 100, locale),
    /** "Oct 14 · 16:00" in UTC, like the design. */
    dateTime: (iso: string) => `${day.format(new Date(iso))} · ${new Date(iso).toISOString().slice(11, 16)}`,
    date: (iso: string) => full.format(new Date(iso)),
    number: (n: number) => n.toLocaleString(tag),
    percent: (r: number | null) => (r === null ? "—" : `${Math.round(r * 100).toLocaleString(tag)}%`),
  };
}

export const fullName = (p: { firstName?: string | null; lastName?: string | null; name?: string | null; email?: string | null }) =>
  p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "—";

/* ---------- Status badges ---------- */
const BOOKING_TONE: Record<BookingStatus, BadgeTone> = {
  pending_payment: "warning",
  confirmed: "success",
  completed: "info",
  cancelled: "danger",
  refunded: "neutral",
  no_show: "lilac",
};
const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  requires_payment: "warning",
  succeeded: "success",
  failed: "danger",
  refunded: "neutral",
  partially_refunded: "info",
};
const PAYOUT_TONE: Record<PayoutStatus, BadgeTone> = { requested: "warning", processing: "info", paid: "success", failed: "danger" };
const USER_TONE: Record<UserStatus, BadgeTone> = { pending_verification: "warning", active: "success", blocked: "danger", deleted: "neutral" };
const DISPUTE_TONE: Record<DisputeStatus, BadgeTone> = { open: "warning", refunded: "success", rejected: "neutral" };

export function StatusBadge({ kind, value }: { kind: "booking" | "payment" | "payout" | "user" | "dispute"; value: string }) {
  const t = useTranslations("admin.enums");
  const tones: Record<string, Record<string, BadgeTone>> = { booking: BOOKING_TONE, payment: PAYMENT_TONE, payout: PAYOUT_TONE, user: USER_TONE, dispute: DISPUTE_TONE };
  const key = `${kind}Status.${value}`;
  return <Badge tone={tones[kind][value] ?? "neutral"}>{t.has(key as never) ? t(key as never) : value}</Badge>;
}

export function useBookingType() {
  const t = useTranslations("admin.enums.bookingType");
  return (b: Pick<AdminBooking, "type" | "durationMin" | "package">) =>
    b.type === "trial"
      ? t("trial", { minutes: b.durationMin })
      : b.type === "package" && b.package
        ? t("package", { size: b.package.lessonCount, used: b.package.lessonsUsed })
        : t("single", { minutes: b.durationMin });
}

/* ---------- Page layout ---------- */
export function PageShell({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[22px] px-4 py-[30px] sm:px-6 lg:px-9">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </header>
      {!isLive && <DemoBanner />}
      {children}
    </div>
  );
}

function DemoBanner() {
  const t = useTranslations("admin.live");
  return (
    <p className="flex items-center gap-2 rounded-xl bg-cream px-4 py-2.5 text-[13px] text-orange-text">
      <Icon name="shield" size={16} />
      {t("demoBanner")}
    </p>
  );
}

/* ---------- Loading / error ---------- */
export function LoadGate<T>({
  data,
  error,
  retrying,
  reload,
  what,
  children,
}: {
  data: T | null;
  error: string | null;
  retrying: boolean;
  reload: () => void;
  what: string;
  children: (d: T) => ReactNode;
}) {
  const t = useTranslations("admin.live");
  if (data) return <>{children(data)}</>;
  if (error)
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6 sm:p-7">
        <p className="font-semibold">{t("loadError", { what })}</p>
        <p className="text-sm text-muted">{t("wakingUp")}</p>
        <p className="text-[13px] break-words text-orange-text">{error}</p>
        <Button variant="teal" size="sm" onClick={reload} disabled={retrying}>
          <Icon name="repeat" size={16} />
          {retrying ? t("loading") : t("retry")}
        </Button>
      </div>
    );
  return (
    <div role="status" className="flex flex-col gap-1.5 rounded-[22px] bg-white p-6 sm:p-7">
      <p className="font-semibold">{t("loading")}</p>
      <p className="text-sm text-muted">{t("wakingUp")}</p>
    </div>
  );
}

/** Small inline error shown when a reload (not the first load) failed; the previous data stays visible. */
export function StaleError({ error, reload, retrying }: { error: string | null; reload: () => void; retrying: boolean }) {
  const t = useTranslations("admin.live");
  if (!error) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-100 px-4 py-2.5 text-[13px] text-danger-text">
      <span className="grow">{t("refreshError")}</span>
      <button type="button" className={linkAction} onClick={reload} disabled={retrying}>
        {t("retry")}
      </button>
    </div>
  );
}

export function Notice({ text }: { text: string }) {
  return (
    <p aria-live="polite" className={cn("rounded-xl bg-teal-100 px-4 py-2.5 text-sm text-teal-deep", !text && "sr-only")}>
      {text}
    </p>
  );
}

/* ---------- Search / filters / pagination ---------- */
export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("flex h-11 w-full items-center gap-2.5 rounded-[10px] border border-line bg-white px-3.5 focus-within:border-teal-dark sm:w-[280px]", className)}>
      <Icon name="search" size={18} className="shrink-0 text-muted" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 grow bg-transparent text-sm text-navy outline-none placeholder:text-muted"
      />
    </label>
  );
}

/** Debounced value for search boxes (avoids one request per keystroke). */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function Pagination({ page, pageSize, total, onPage, label }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; label: string }) {
  const t = useTranslations("admin.live.pagination");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[13px] text-muted">
      <span>{t("range", { from, to, total })}</span>
      {pages > 1 && (
        <span className="flex items-center gap-2">
          <Button variant="outlineLight" size="sm" className="h-9 px-3 text-[13px]" onClick={() => onPage(page - 1)} disabled={page <= 1}>
            <Icon name="chevronLeft" size={16} />
            {t("previous")}
          </Button>
          <span aria-current="page">{t("page", { page, pages })}</span>
          <Button variant="outlineLight" size="sm" className="h-9 px-3 text-[13px]" onClick={() => onPage(page + 1)} disabled={page >= pages}>
            {t("next")}
            <Icon name="chevronRight" size={16} />
          </Button>
        </span>
      )}
    </nav>
  );
}

/* ---------- Tabs (pill style) ---------- */
export function PillTabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn("h-[34px] rounded-full px-3.5 text-[13px]", value === tab.id ? "bg-navy text-white" : "border border-line bg-white text-navy hover:bg-beige")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Drawer (modal dialog on the end side) ---------- */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useTranslations("admin.live");
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-t`}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="ms-auto me-0 mt-0 mb-0 h-dvh max-h-dvh w-full max-w-[520px] bg-beige-2 p-0 text-navy backdrop:bg-navy/40"
    >
      <div className="flex min-h-full flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-t`} className="text-xl font-extrabold">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t("close")}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white hover:bg-beige"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold tracking-[1px] text-muted uppercase">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

/* ---------- Confirmation (inline, with optional note) ---------- */
export function Confirm({
  question,
  confirmLabel,
  tone = "teal",
  note,
  onConfirm,
  onCancel,
}: {
  question: ReactNode;
  confirmLabel: string;
  tone?: "teal" | "danger";
  /** Optional or required text sent with the action (reason, message…). */
  note?: { label: string; placeholder?: string; required?: boolean; hint?: string };
  onConfirm: (note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.live");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const submit = async () => {
    if (note?.required && !text.trim()) {
      setError(t("noteRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(text.trim());
    } catch (e) {
      setError(errorText(e, t("actionError")));
      setBusy(false);
    }
  };
  return (
    <div role="group" aria-labelledby={`${id}-q`} className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-cream p-3.5">
      <p id={`${id}-q`} className="text-sm font-semibold">
        {question}
      </p>
      {note && (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          {note.label}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={note.placeholder}
            rows={3}
            maxLength={500}
            required={note.required}
            className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none"
          />
          {note.hint && <span className="font-normal text-muted">{note.hint}</span>}
        </label>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-danger-text">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant={tone} size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={submit} disabled={busy}>
          {busy ? t("sending") : confirmLabel}
        </Button>
        <Button variant="outlineLight" size="sm" className="h-[38px] px-3.5 text-[13px]" onClick={onCancel} disabled={busy}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

/* ---------- CSV ---------- */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  // BOM so spreadsheet apps read accented, Arabic, Chinese and Cyrillic text correctly.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const centsCsv = (cents: number) => (cents / 100).toFixed(2);
