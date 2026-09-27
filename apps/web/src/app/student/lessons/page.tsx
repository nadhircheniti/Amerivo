import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LessonsView } from "./lessons-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.lessons");
  return { title: t("title") };
}

export default function StudentLessonsPage() {
  return <LessonsView />;
}
