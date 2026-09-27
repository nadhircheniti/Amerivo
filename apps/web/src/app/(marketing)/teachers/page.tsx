import type { Metadata } from "next";
import { getTeachers } from "@/lib/teachers";
import { TeacherSearch } from "./_components/teacher-search";

export const metadata: Metadata = {
  title: "Find a teacher",
  description: "Browse verified U.S. native English teachers by specialty, price and who they teach.",
};

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const { teachers } = await getTeachers();

  return (
    <div className="mx-auto max-w-[1440px] pb-20">
      <TeacherSearch key={query} initialQuery={query} teachers={teachers} />
    </div>
  );
}
