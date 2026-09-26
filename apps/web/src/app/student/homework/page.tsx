import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Homework" };

export default function Page() {
  return <ComingSoon title="Homework" description="All assigned, pending and completed homework in one place." icon="book" backHref="/student" backLabel="Back to overview" />;
}
