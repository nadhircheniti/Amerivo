import { currentTeacher, packagePrice } from "@/lib/mock-data";

export type EarningStatus = "Pending" | "Available" | "Trial" | "Refunded";

export type LessonEarning = {
  id: string;
  date: string;
  student: string;
  lesson: string;
  /** Gross price paid by the student for this lesson (USD). */
  price: number;
  status: EarningStatus;
};

const unit = currentTeacher.priceUsd;
const tenPackUnit = packagePrice(unit, 10) / 10;

/** Sample lesson ledger (October). */
export const lessonEarnings: LessonEarning[] = [
  { id: "e1", date: "Oct 14", student: "Maria S.", lesson: "50 min", price: unit, status: "Pending" },
  { id: "e2", date: "Oct 13", student: "Lucas M.", lesson: "50 min", price: unit, status: "Available" },
  { id: "e3", date: "Oct 12", student: "Ana C.", lesson: "10-pack (1/10)", price: tenPackUnit, status: "Available" },
  { id: "e4", date: "Oct 11", student: "Kenji T.", lesson: "Trial 20 min", price: 0, status: "Trial" },
  { id: "e5", date: "Oct 10", student: "Maria S.", lesson: "50 min", price: unit, status: "Available" },
  { id: "e6", date: "Oct 9", student: "Ana C.", lesson: "50 min", price: unit, status: "Refunded" },
];

export type Payout = { id: string; date: string; period: string; method: string; lessons: number; amount: number };

export const payouts: Payout[] = [
  { id: "p9", date: "Sep 28", period: "September", method: "Chase •••• 4821", lessons: 43, amount: 1190 },
  { id: "p8", date: "Aug 28", period: "August", method: "Chase •••• 4821", lessons: 38, amount: 1050 },
  { id: "p7", date: "Jul 28", period: "July", method: "Chase •••• 4821", lessons: 35, amount: 960 },
  { id: "p6", date: "Jun 28", period: "June", method: "Chase •••• 4821", lessons: 30, amount: 820 },
];

/** Net earnings per month (after commission), last 5 months. */
export const monthlyNet = [
  { month: "Jun", value: 820 },
  { month: "Jul", value: 960 },
  { month: "Aug", value: 1050 },
  { month: "Sep", value: 1190 },
  { month: "Oct", value: 1092, current: true },
];
