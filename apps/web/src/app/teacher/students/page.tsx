import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Students" };

export default function Page() {
  return <ComingSoon title="Students" description="Active and past students, lesson history and your private notes." icon="users" backHref="/teacher" backLabel="Back to overview" />;
}
