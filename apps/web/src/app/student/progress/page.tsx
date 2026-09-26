import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Progress" };

export default function Page() {
  return <ComingSoon title="Progress" description="Your level history, hours studied and skills over time." icon="chart" backHref="/student" backLabel="Back to overview" />;
}
