import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Payments" };

export default function Page() {
  return <ComingSoon title="Payments" description="Invoices, payment history and your lesson packages." icon="wallet" backHref="/student" backLabel="Back to overview" />;
}
