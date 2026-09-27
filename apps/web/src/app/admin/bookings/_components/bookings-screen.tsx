"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LiveBookingsTable } from "../../_components/live/bookings";
import { sampleBookings } from "../../_components/live/samples";
import type { AdminBooking, BookingStatus, Page } from "../../_components/live/types";
import {
  LoadGate,
  Notice,
  PageShell,
  Pagination,
  SearchBox,
  StaleError,
  centsCsv,
  control,
  downloadCsv,
  fullName,
  panel,
  useBookingType,
  useDebounced,
  useFormat,
} from "../../_components/live/ui";
import { isLive, useAdminData } from "../../_components/live/use-admin-data";

type Filter = "" | BookingStatus | "disputed";
const FILTERS: Filter[] = ["", "confirmed", "pending_payment", "completed", "no_show", "cancelled", "refunded", "disputed"];

export function BookingsScreen() {
  const t = useTranslations("admin.bookingsPage");
  const te = useTranslations("admin.enums.bookingStatus");
  const tp = useTranslations("admin.enums.paymentStatus");
  const td = useTranslations("admin.enums.disputeStatus");
  const fmt = useFormat();
  const typeLabel = useBookingType();
  const [status, setStatus] = useState<Filter>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const q = useDebounced(search.trim());

  const path = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (from) p.set("from", `${from}T00:00:00Z`);
    // "To" is inclusive: up to the end of that day (UTC).
    if (to) p.set("to", new Date(Date.parse(`${to}T00:00:00Z`) + 86_400_000).toISOString());
    if (q) p.set("search", q);
    p.set("page", String(page));
    return `/admin/bookings?${p}`;
  }, [status, from, to, q, page]);

  const sample = useMemo<Page<AdminBooking>>(() => {
    const items = sampleBookings.filter(
      (b) =>
        (!status || (status === "disputed" ? !!b.dispute : b.status === status)) && (!q || `${fullName(b.student)} ${fullName(b.teacher)}`.toLowerCase().includes(q.toLowerCase())),
    );
    return { items, total: items.length, page: 1, pageSize: 20 };
  }, [status, q]);

  const { data, error, retrying, reload } = useAdminData<Page<AdminBooking>>(path, sample);
  const filtered = !!(status || from || to || q);
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const exportCsv = () => {
    if (!data) return;
    downloadCsv("amerivo-bookings.csv", [
      [t("reference"), t("dateUtc"), t("student"), t("teacher"), t("type"), t("amountUsd"), t("status"), t("payment"), t("disputed")],
      ...data.items.map((b) => [
        b.id,
        fmt.dateTime(b.startsAt),
        fullName(b.student),
        fullName(b.teacher),
        typeLabel(b),
        centsCsv(b.amountCents),
        te(b.status),
        b.paymentStatus ? tp(b.paymentStatus) : "",
        b.dispute ? td(b.dispute.status) : "",
      ]),
    ]);
  };

  return (
    <PageShell
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <Button variant="navy" size="sm" className="h-11 rounded-[10px] px-[18px]" onClick={exportCsv} disabled={!data?.items.length}>
          {t("exportCsv")}
        </Button>
      }
    >
      <section aria-label={t("filters")} className="flex flex-col gap-3 rounded-[20px] bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <SearchBox value={search} onChange={(v) => reset(() => setSearch(v))} label={t("search")} placeholder={t("searchPlaceholder")} />
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          {t("status")}
          <select value={status} onChange={(e) => reset(() => setStatus(e.target.value as Filter))} className={control}>
            {FILTERS.map((f) => (
              <option key={f || "all"} value={f}>
                {f === "" ? t("allStatuses") : f === "disputed" ? t("disputedFilter") : te(f)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          {t("from")}
          <input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} className={control} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          {t("to")}
          <input type="date" value={to} min={from || undefined} onChange={(e) => reset(() => setTo(e.target.value))} className={control} />
        </label>
        {filtered && (
          <Button
            variant="ghost"
            className="h-11 text-[13px]"
            onClick={() =>
              reset(() => {
                setStatus("");
                setFrom("");
                setTo("");
                setSearch("");
              })
            }
          >
            {t("clearFilters")}
          </Button>
        )}
      </section>

      <Notice text={notice} />

      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {(d) => (
          <section className={panel} aria-busy={!isLive ? undefined : retrying}>
            <StaleError error={error} reload={reload} retrying={retrying} />
            <LiveBookingsTable
              rows={d.items}
              caption={t("title")}
              empty={filtered ? t("emptyFiltered") : t("empty")}
              onChanged={(n) => {
                setNotice(n);
                reload();
              }}
            />
            <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onPage={setPage} label={t("pagination")} />
          </section>
        )}
      </LoadGate>
    </PageShell>
  );
}
