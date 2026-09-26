import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Disputes & refunds" };

export default function Page() {
  return <ComingSoon title="Disputes & refunds" description="Complaints and refund requests (24-hour window)." icon="shield" backHref="/admin" backLabel="Back to analytics" />;
}
