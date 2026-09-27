import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getLessonForReport } from "./_data";
import { ReportForm } from "./_components/report-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.report");
  return { title: t("metaTitle") };
}

export default async function LessonReportPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLessonForReport(lessonId);

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-[60px] lg:py-10">
      <ReportForm lesson={lesson} />
    </div>
  );
}
