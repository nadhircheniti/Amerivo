"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { bookings } from "../_data";
import { useBookingFormat } from "./use-booking-format";

/** Downloads the (sample) bookings list as CSV. */
export function ExportCsvButton() {
  const t = useTranslations("admin.export");
  const tb = useTranslations("admin.bookings");
  const { formatDate, typeLabel } = useBookingFormat();
  const onClick = () => {
    const header = [t("bookingId"), tb("dateUtc"), tb("student"), tb("teacher"), tb("typeHeader"), t("amountUsd"), tb("statusHeader")];
    const rows = bookings.map((b) => [
      b.id,
      formatDate(b.dateUtc),
      b.student,
      b.teacher,
      typeLabel(b.type),
      b.amount === null ? "0" : b.amount.toFixed(2),
      tb(`status.${b.status}`),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    // BOM so spreadsheet apps read accented, Arabic, Chinese and Cyrillic headers correctly.
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "amerivo-bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="navy" size="sm" className="h-11 rounded-[10px] px-[18px]" onClick={onClick}>
      {t("button")}
    </Button>
  );
}
