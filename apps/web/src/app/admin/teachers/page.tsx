import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { API_URL } from "@/lib/api";
import { LiveTeacherManagement } from "./_components/live-teacher-management";
import { TeacherManagement } from "./_components/teacher-management";
import { applicants } from "./_data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.teachers");
  return { title: t("metaTitle") };
}

export default function AdminTeachersPage() {
  return (
    <div className="px-4 py-[30px] sm:px-6 lg:px-9">
      {/* Live mode reads and updates real applications; demo mode (no API) keeps the sample data. */}
      {API_URL ? <LiveTeacherManagement /> : <TeacherManagement initial={applicants} />}
    </div>
  );
}
