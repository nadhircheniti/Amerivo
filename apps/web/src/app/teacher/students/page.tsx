import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { API_URL } from "@/lib/api";
import { DemoStudents, LiveStudents } from "./_components/students-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.students");
  return { title: t("metaTitle") };
}

export default function StudentsPage() {
  // Connected to the API: the teacher's real students; otherwise sample data.
  return API_URL ? <LiveStudents /> : <DemoStudents />;
}
