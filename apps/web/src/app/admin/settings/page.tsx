import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Settings & audit log" };

export default function Page() {
  return <ComingSoon title="Settings & audit log" description="Payout schedule, commission, admin users with 2FA and the audit log." icon="settings" backHref="/admin" backLabel="Back to analytics" />;
}
