import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { API_URL } from "@/lib/api";
import { getLessonForReport } from "./_data";
import { LiveReport } from "./_components/live-report";
import { ReportForm } from "./_components/report-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.report");
  return { title: t("metaTitle") };
}

/** `lessonId` is the booking id (PUT /bookings/:id/report); demo mode shows a sample lesson. */
export default async function LessonReportPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;

  return <div className="px-4 py-8 sm:px-8 lg:px-[60px] lg:py-10">{API_URL ? <LiveReport bookingId={lessonId} /> : <ReportForm lesson={getLessonForReport(lessonId)} />}</div>;
}
