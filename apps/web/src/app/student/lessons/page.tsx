import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "My lessons" };

export default function Page() {
  return <ComingSoon title="My lessons" description="Your full lesson calendar, past lessons and reports will live here." icon="calendar" backHref="/student" backLabel="Back to overview" />;
}
