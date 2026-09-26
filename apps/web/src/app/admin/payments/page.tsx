import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Payments & payouts" };

export default function Page() {
  return <ComingSoon title="Payments & payouts" description="Revenue, teacher payouts, refunds and outstanding payments." icon="wallet" backHref="/admin" backLabel="Back to analytics" />;
}
