import type { Metadata } from "next";
import { PLATFORM_COMMISSION } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { BookingsTable } from "./_components/bookings-table";
import { ExportCsvButton } from "./_components/export-csv-button";
import { RefundRequests } from "./_components/refund-requests";
import { RevenueChart } from "./_components/revenue-chart";
import { bookings } from "./_data";

export const metadata: Metadata = { title: "Platform analytics · Amerivo Admin" };

const kpis: { label: string; value: string; hint?: string; hintClassName?: string }[] = [
  { label: "Total students", value: "[N]", hint: "Up vs previous period", hintClassName: "text-teal-dark" },
  { label: "Active students", value: "[N]", hint: "Booked in last 30 days" },
  { label: "Total teachers", value: "[N]", hint: "5 applications pending" },
  { label: "Revenue (gross)", value: "$[N]", hint: `Commission ${Math.round(PLATFORM_COMMISSION * 100)}%: $[N]` },
  { label: "Lessons completed", value: "[N]" },
  { label: "Retention rate", value: "[N]%", hint: "Students booking again within 30 days" },
  { label: "Conversion rate", value: "[N]%", hint: "Trial → paid lesson" },
  { label: "Outstanding payouts", value: "$[N]", hint: "Due Oct 28" },
];

export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-[22px] px-4 py-[30px] sm:px-6 lg:px-9">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[28px]">Platform analytics</h1>
          <p className="mt-1 text-sm text-muted">Sample data shown · figures update in real time</p>
        </div>
        <div className="flex gap-2.5">
          <label>
            <span className="sr-only">Period</span>
            <select
              defaultValue="30d"
              className="h-11 rounded-[10px] border border-line bg-white px-3 text-sm text-navy focus:border-teal-dark focus:outline-none"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">This year</option>
            </select>
          </label>
          <ExportCsvButton />
        </div>
      </header>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1 rounded-2xl bg-white px-5 py-[18px]">
            <span className="text-[13px] text-muted">{k.label}</span>
            <span className="font-display text-[26px] leading-tight font-extrabold">{k.value}</span>
            {k.hint && <span className={cn("text-xs text-muted", k.hintClassName)}>{k.hint}</span>}
          </div>
        ))}
      </section>

      <div className="grid gap-[18px] xl:grid-cols-[1.5fr_1fr]">
        <RevenueChart />
        <RefundRequests />
      </div>

      <BookingsTable initial={bookings} />
    </div>
  );
}
