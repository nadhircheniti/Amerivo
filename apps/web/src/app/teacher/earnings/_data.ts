import { currentTeacher, packagePrice } from "@/lib/mock-data";

/** Status ids; labels live in messages/<locale>/teacher.json → earnings.status. */
export type EarningStatus = "pending" | "available" | "trial" | "refunded" | "paid";

/** What was taught: a single lesson, one lesson of a pack, or a free trial. */
export type LessonKind = { type: "single"; minutes: number } | { type: "pack"; size: number; index: number } | { type: "trial"; minutes: number };

export type LessonEarning = {
  id: string;
  /** yyyy-mm-dd */
  date: string;
  student: string;
  lesson: LessonKind;
  /** Gross price paid by the student for this lesson (USD). */
  price: number;
  status: EarningStatus;
  /** Exact amounts from the API (USD); computed from `price` when absent (sample data). */
  commission?: number;
  net?: number;
};

const unit = currentTeacher.priceUsd;
const tenPackUnit = packagePrice(unit, 10) / 10;

/** Sample lesson ledger (October). */
export const lessonEarnings: LessonEarning[] = [
  { id: "e1", date: "2026-10-14", student: "Maria S.", lesson: { type: "single", minutes: 50 }, price: unit, status: "pending" },
  { id: "e2", date: "2026-10-13", student: "Lucas M.", lesson: { type: "single", minutes: 50 }, price: unit, status: "available" },
  { id: "e3", date: "2026-10-12", student: "Ana C.", lesson: { type: "pack", size: 10, index: 1 }, price: tenPackUnit, status: "available" },
  { id: "e4", date: "2026-10-11", student: "Kenji T.", lesson: { type: "trial", minutes: 20 }, price: 0, status: "trial" },
  { id: "e5", date: "2026-10-10", student: "Maria S.", lesson: { type: "single", minutes: 50 }, price: unit, status: "available" },
  { id: "e6", date: "2026-10-09", student: "Ana C.", lesson: { type: "single", minutes: 50 }, price: unit, status: "refunded" },
];

/** date: yyyy-mm-dd · period: yyyy-mm */
export type Payout = { id: string; date: string; period: string; method: string; lessons: number; amount: number; status?: "requested" | "processing" | "paid" | "failed" };

export const payouts: Payout[] = [
  { id: "p9", date: "2026-09-28", period: "2026-09", method: "Chase •••• 4821", lessons: 43, amount: 1190 },
  { id: "p8", date: "2026-08-28", period: "2026-08", method: "Chase •••• 4821", lessons: 38, amount: 1050 },
  { id: "p7", date: "2026-07-28", period: "2026-07", method: "Chase •••• 4821", lessons: 35, amount: 960 },
  { id: "p6", date: "2026-06-28", period: "2026-06", method: "Chase •••• 4821", lessons: 30, amount: 820 },
];

/** Net earnings per month (after commission), last 5 months. month: yyyy-mm */
export const monthlyNet = [
  { month: "2026-06", value: 820 },
  { month: "2026-07", value: 960 },
  { month: "2026-08", value: 1050 },
  { month: "2026-09", value: 1190 },
  { month: "2026-10", value: 1092, current: true },
];
