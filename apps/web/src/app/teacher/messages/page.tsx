import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Messages" };

export default function Page() {
  return <ComingSoon title="Messages" description="Conversations with your students, files and homework." icon="message" backHref="/teacher" backLabel="Back to overview" />;
}
