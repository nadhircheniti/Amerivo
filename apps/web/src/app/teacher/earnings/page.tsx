import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PLATFORM_COMMISSION, formatUsd } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { EarningsTabs } from "./_components/earnings-tabs";
import { PayoutMethod } from "./_components/payout-method";
import { WithdrawCard } from "./_components/withdraw-card";
import { lessonEarnings, monthlyNet, payouts } from "./_data";

export const metadata: Metadata = { title: "Earnings · Amerivo English" };

const CHART_HEIGHT = 160; // px of the tallest bar

export default function EarningsPage() {
  const max = Math.max(...monthlyNet.map((m) => m.value));
  const fmt0 = (n: number) => formatUsd(n).replace(".00", "");

  return (
    <div className="flex flex-col gap-[22px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[30px]">Earnings</h1>
          <p className="mt-1 text-[15px] text-muted">
            Paid through Stripe Connect · {Math.round(PLATFORM_COMMISSION * 100)}% platform commission · Monthly payout by the 28th
          </p>
        </div>
        <Button variant="outline" className="shrink-0 self-start sm:self-auto">
          Download statements
        </Button>
      </header>

      <section aria-label="Balances" className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <WithdrawCard amount={644} lessons={23} destination="Chase •••• 4821" />
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-white p-[26px]">
          <span className="text-sm text-muted">Pending (lessons not yet completed)</span>
          <span className="font-display text-[32px] leading-tight font-extrabold">$448.00</span>
          <span className="text-[13px] text-muted">Released after each lesson ends</span>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[22px] bg-white p-[26px]">
          <span className="text-sm text-muted">Paid in 2026</span>
          <span className="font-display text-[32px] leading-tight font-extrabold">$9,380.00</span>
          <span className="text-[13px] text-muted">Next automatic payout: Oct 28</span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <section aria-labelledby="chart-heading" className="flex flex-col gap-4 rounded-[22px] bg-white p-5 sm:p-6">
          <h2 id="chart-heading" className="text-[17px] font-bold">
            Net earnings per month
          </h2>
          <figure className="m-0">
            <ul className="flex h-[200px] items-end gap-3.5 border-b border-line-soft pb-0.5" aria-label="Net earnings per month, June to October">
              {monthlyNet.map((m) => (
                <li key={m.month} className="flex grow basis-0 flex-col items-center gap-1.5">
                  <span className={cn("text-[11px]", m.current ? "font-bold text-navy" : "text-muted")}>
                    <span className="sr-only">{m.month}: </span>
                    {fmt0(m.value)}
                    {m.current && <span className="sr-only"> (current month, so far)</span>}
                  </span>
                  <div
                    className={cn("w-full rounded-t-md", m.current ? "bg-teal-dark" : "bg-teal-200")}
                    style={{ height: Math.round((m.value / max) * CHART_HEIGHT) }}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-3.5 text-xs text-muted" aria-hidden="true">
              {monthlyNet.map((m) => (
                <span key={m.month} className={cn("grow basis-0 text-center", m.current && "font-bold text-navy")}>
                  {m.month}
                </span>
              ))}
            </div>
            <figcaption className="sr-only">Bar chart of your net earnings after commission for each of the last five months.</figcaption>
          </figure>
          <PayoutMethod />
        </section>

        <EarningsTabs lessons={lessonEarnings} payouts={payouts} />
      </div>
    </div>
  );
}
