import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherManagement } from "./_components/teacher-management";
import { applicants } from "./_data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.teachers");
  return { title: t("metaTitle") };
}

export default function AdminTeachersPage() {
  return (
    <div className="px-4 py-[30px] sm:px-6 lg:px-9">
      <TeacherManagement initial={applicants} />
    </div>
  );
}
