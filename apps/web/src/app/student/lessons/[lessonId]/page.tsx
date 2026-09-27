import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { intlTags, type Locale } from "@/i18n/config";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/primitives";
import { currentStudent, getTeacher, teachers } from "@/lib/mock-data";
import { ReviewForm } from "./review-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.lesson");
  return { title: t("metaTitle") };
}

// Sample report as sent by the teacher (TODO(api): GET /lessons/:id/report).
const sampleReport = {
  teacherSlug: "sarah-mitchell",
  date: "2026-10-14",
  durationMin: 50,
  topic: "Leading a team meeting",
  homework: { due: "2026-10-15", text: "Write a 150-word meeting agenda for your next team call." },
  nextRecommendation: "Negotiation phrases; role-play a budget discussion.",
  strengths: "Confident tone, good structure, uses linking words well.",
  toWorkOn: "Past simple vs present perfect; pronunciation of -ed endings.",
};

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-white/8 px-4 py-3.5">
      <h2 className="font-sans text-[13px] font-bold tracking-wide text-yellow uppercase">{label}</h2>
      <p className="mt-0.5 text-[15px] leading-normal">{children}</p>
    </div>
  );
}

export default async function LessonSummaryPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  // Every id shows the sample report until the lessons API exists.
  const report = sampleReport;
  const teacher = getTeacher(report.teacherSlug) ?? teachers[0];
  const firstName = teacher.name.split(" ")[0];
  const t = await getTranslations("student");
  const locale = (await getLocale()) as Locale;
  // Sample dates are calendar days: format them in UTC so they never shift.
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(intlTags[locale], { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <Link href="/student" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-teal-dark hover:text-navy">
        <Icon name="chevronLeft" size={16} strokeWidth={2} />
        {t("backToOverview")}
      </Link>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-[28px] bg-navy p-6 text-white sm:p-8" aria-labelledby="summary-title">
          <span className="font-display text-xs font-semibold tracking-[3px] text-yellow uppercase">{t("lesson.eyebrow")}</span>
          <h1 id="summary-title" className="text-[26px] font-bold text-white">
            {t("lesson.niceWork", { name: currentStudent.firstName })}
          </h1>
          <p className="text-sm text-ink-soft">
            {t("lesson.meta", { teacher: teacher.name, date: fmtDate(report.date), minutes: report.durationMin, topic: report.topic })}
            <span className="sr-only"> {t("lesson.srLesson", { id: lessonId })}</span>
          </p>
          <div className="flex flex-col gap-3">
            <Block label={t("lesson.homeworkDue", { date: fmtDate(report.homework.due) })}>{report.homework.text}</Block>
            <Block label={t("lesson.nextRecommendation")}>{report.nextRecommendation}</Block>
            <div className="grid gap-3 sm:grid-cols-2">
              <Block label={t("lesson.strengths")}>{report.strengths}</Block>
              <Block label={t("lesson.toWorkOn")}>{report.toWorkOn}</Block>
            </div>
          </div>
        </section>

        <Card className="flex flex-col gap-[18px] rounded-[28px] p-6 sm:p-8">
          <h2 className="text-[22px] font-bold">{t("lesson.howWas", { name: firstName })}</h2>
          <ReviewForm teacherFirstName={firstName} />
          <div className="flex flex-col gap-3 border-t border-line-soft pt-[18px] sm:flex-row">
            <ButtonLink href={`/teachers/${teacher.slug}`} variant="outline" className="flex-1">
              {t("lesson.bookNext", { name: firstName })}
            </ButtonLink>
            <ButtonLink href="/teachers" variant="outlineLight" className="flex-1 font-semibold">
              {t("lesson.tryAnother")}
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
