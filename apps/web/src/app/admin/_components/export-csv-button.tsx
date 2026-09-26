"use client";

import { Button } from "@/components/ui/button";
import { bookings } from "../_data";

/** Downloads the (sample) bookings list as CSV. */
export function ExportCsvButton() {
  const onClick = () => {
    const header = ["Booking ID", "Date (UTC)", "Student", "Teacher", "Type", "Amount (USD)", "Status"];
    const rows = bookings.map((b) => [b.id, b.dateUtc, b.student, b.teacher, b.type, b.amount === null ? "0" : b.amount.toFixed(2), b.status]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "amerivo-bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="navy" size="sm" className="h-11 rounded-[10px] px-[18px]" onClick={onClick}>
      Export CSV
    </Button>
  );
}
