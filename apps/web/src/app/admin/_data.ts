/** Sample admin data for the UI milestone — placeholders, not real platform figures. */

export type BookingStatus = "Confirmed" | "Pending payment" | "Completed" | "Cancelled" | "Refunded";
export type BookingTab = "upcoming" | "completed" | "cancelled";

export type Booking = {
  id: string;
  dateUtc: string;
  student: string;
  teacher: string;
  type: string;
  amount: number | null; // null = free trial
  status: BookingStatus;
  tab: BookingTab;
};

export const bookings: Booking[] = [
  { id: "b-2101", dateUtc: "Oct 14 · 16:00", student: "Maria Silva", teacher: "Sarah Mitchell", type: "Single 50 min", amount: 35, status: "Confirmed", tab: "upcoming" },
  { id: "b-2102", dateUtc: "Oct 14 · 19:00", student: "Kenji Tanaka", teacher: "Sarah Mitchell", type: "Trial 20 min", amount: null, status: "Confirmed", tab: "upcoming" },
  { id: "b-2103", dateUtc: "Oct 15 · 14:00", student: "Acme Corp (group)", teacher: "Michael Brooks", type: "Corporate pack 20", amount: 900, status: "Pending payment", tab: "upcoming" },
  { id: "b-2094", dateUtc: "Oct 13 · 15:00", student: "Lucas Moreau", teacher: "Sarah Mitchell", type: "Single 50 min", amount: 35, status: "Completed", tab: "completed" },
  { id: "b-2091", dateUtc: "Oct 13 · 09:00", student: "Ana Costa", teacher: "Sarah Mitchell", type: "10-pack (2/10)", amount: 31.5, status: "Completed", tab: "completed" },
  { id: "b-2088", dateUtc: "Oct 12 · 18:00", student: "Yuki Sato", teacher: "Amanda Lee", type: "Single 50 min", amount: 45, status: "Completed", tab: "completed" },
  { id: "b-2080", dateUtc: "Oct 16 · 15:00", student: "Ana Costa", teacher: "Sarah Mitchell", type: "Single 50 min", amount: 35, status: "Refunded", tab: "cancelled" },
  { id: "b-2077", dateUtc: "Oct 11 · 20:00", student: "Omar Haddad", teacher: "David King", type: "5-pack (3/5)", amount: 20.9, status: "Cancelled", tab: "cancelled" },
];

/** Monthly sample series for the revenue & lessons chart. */
export const trend = [
  { month: "Feb", revenue: 21, lessons: 18 },
  { month: "Mar", revenue: 27, lessons: 24 },
  { month: "Apr", revenue: 38, lessons: 29 },
  { month: "May", revenue: 36, lessons: 31 },
  { month: "Jun", revenue: 55, lessons: 42 },
  { month: "Jul", revenue: 60, lessons: 45 },
  { month: "Aug", revenue: 71, lessons: 56 },
  { month: "Sep", revenue: 82, lessons: 60 },
  { month: "Oct", revenue: 92, lessons: 70 },
];
