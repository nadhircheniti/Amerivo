import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Settings" };

export default function Page() {
  return <ComingSoon title="Settings" description="Profile, notifications, time zone and password." icon="settings" backHref="/student" backLabel="Back to overview" />;
}
