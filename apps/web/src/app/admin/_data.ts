/** Sample admin data for the UI milestone — placeholders, not real platform figures. */

/** Status ids; labels come from messages admin.bookings.status.* */
export type BookingStatus = "confirmed" | "pendingPayment" | "completed" | "cancelled" | "refunded";
export type BookingTab = "upcoming" | "completed" | "cancelled";

/** Lesson type ids; labels come from messages admin.bookings.type.* */
export type BookingType =
  | { kind: "single" }
  | { kind: "trial" }
  | { kind: "pack"; size: number; used: number }
  | { kind: "corporate"; size: number };

export type Booking = {
  id: string;
  dateUtc: string; // ISO date-time in UTC, e.g. "2026-10-14T16:00:00Z"
  student: string;
  teacher: string;
  type: BookingType;
  amount: number | null; // null = free trial
  status: BookingStatus;
  tab: BookingTab;
};

export const bookings: Booking[] = [
  { id: "b-2101", dateUtc: "2026-10-14T16:00:00Z", student: "Maria Silva", teacher: "Sarah Mitchell", type: { kind: "single" }, amount: 35, status: "confirmed", tab: "upcoming" },
  { id: "b-2102", dateUtc: "2026-10-14T19:00:00Z", student: "Kenji Tanaka", teacher: "Sarah Mitchell", type: { kind: "trial" }, amount: null, status: "confirmed", tab: "upcoming" },
  { id: "b-2103", dateUtc: "2026-10-15T14:00:00Z", student: "Acme Corp (group)", teacher: "Michael Brooks", type: { kind: "corporate", size: 20 }, amount: 900, status: "pendingPayment", tab: "upcoming" },
  { id: "b-2094", dateUtc: "2026-10-13T15:00:00Z", student: "Lucas Moreau", teacher: "Sarah Mitchell", type: { kind: "single" }, amount: 35, status: "completed", tab: "completed" },
  { id: "b-2091", dateUtc: "2026-10-13T09:00:00Z", student: "Ana Costa", teacher: "Sarah Mitchell", type: { kind: "pack", size: 10, used: 2 }, amount: 31.5, status: "completed", tab: "completed" },
  { id: "b-2088", dateUtc: "2026-10-12T18:00:00Z", student: "Yuki Sato", teacher: "Amanda Lee", type: { kind: "single" }, amount: 45, status: "completed", tab: "completed" },
  { id: "b-2080", dateUtc: "2026-10-16T15:00:00Z", student: "Ana Costa", teacher: "Sarah Mitchell", type: { kind: "single" }, amount: 35, status: "refunded", tab: "cancelled" },
  { id: "b-2077", dateUtc: "2026-10-11T20:00:00Z", student: "Omar Haddad", teacher: "David King", type: { kind: "pack", size: 5, used: 3 }, amount: 20.9, status: "cancelled", tab: "cancelled" },
];

/** Monthly sample series for the revenue & lessons chart (month = 1–12 of 2026, label formatted per locale). */
export const trend = [
  { month: 2, revenue: 21, lessons: 18 },
  { month: 3, revenue: 27, lessons: 24 },
  { month: 4, revenue: 38, lessons: 29 },
  { month: 5, revenue: 36, lessons: 31 },
  { month: 6, revenue: 55, lessons: 42 },
  { month: 7, revenue: 60, lessons: 45 },
  { month: 8, revenue: 71, lessons: 56 },
  { month: 9, revenue: 82, lessons: 60 },
  { month: 10, revenue: 92, lessons: 70 },
];
