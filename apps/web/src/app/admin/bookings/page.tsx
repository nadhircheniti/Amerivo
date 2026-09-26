import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Bookings" };

export default function Page() {
  return <ComingSoon title="Bookings" description="Upcoming, completed and cancelled lessons with reschedule and override." icon="calendar" backHref="/admin" backLabel="Back to analytics" />;
}
