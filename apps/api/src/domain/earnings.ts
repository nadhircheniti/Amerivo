/**
 * Teacher earnings & payouts (spec §8, §9).
 * Platform collects the payment, keeps a 20% commission; the rest becomes available to the
 * teacher once the lesson is completed. Teachers can withdraw on demand, otherwise the
 * available balance is paid automatically on the 28th of each month (admin can override).
 */
export const COMMISSION_RATE = 0.2;
export const MONTHLY_PAYOUT_DAY = 28;
export const MIN_WITHDRAWAL_CENTS = 2000;

export function splitEarning(grossCents: number, rate = COMMISSION_RATE) {
  if (!Number.isInteger(grossCents) || grossCents < 0) throw new Error("grossCents must be a non-negative integer");
  const commissionCents = Math.round(grossCents * rate);
  return { grossCents, commissionCents, netCents: grossCents - commissionCents };
}

/** Next automatic payout date (UTC) on or after `now`. */
export function nextMonthlyPayoutDate(now: Date, day = MONTHLY_PAYOUT_DAY) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const thisMonth = new Date(Date.UTC(y, m, day));
  const startOfToday = Date.UTC(y, m, now.getUTCDate());
  return startOfToday <= thisMonth.getTime() ? thisMonth : new Date(Date.UTC(y, m + 1, day));
}

export interface LedgerRow {
  netCents: number;
  status: "pending" | "available" | "paid" | "reversed";
}

export function balances(rows: LedgerRow[]) {
  const sum = (s: LedgerRow["status"]) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.netCents, 0);
  return { pendingCents: sum("pending"), availableCents: sum("available"), paidCents: sum("paid") };
}

export function canWithdraw(availableCents: number) {
  return availableCents >= MIN_WITHDRAWAL_CENTS;
}
