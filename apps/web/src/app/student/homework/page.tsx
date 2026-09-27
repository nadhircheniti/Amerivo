import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeworkView } from "./homework-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.homework");
  return { title: t("title") };
}

export default function StudentHomeworkPage() {
  return <HomeworkView />;
}
