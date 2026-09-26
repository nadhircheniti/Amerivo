import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Students" };

export default function Page() {
  return <ComingSoon title="Students" description="Add, edit, block, contact and refund students." icon="users" backHref="/admin" backLabel="Back to analytics" />;
}
