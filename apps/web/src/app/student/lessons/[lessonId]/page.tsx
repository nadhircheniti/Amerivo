import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LessonView } from "./lesson-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.lesson");
  return { title: t("metaTitle") };
}

export default async function LessonSummaryPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <LessonView lessonId={lessonId} />;
}
