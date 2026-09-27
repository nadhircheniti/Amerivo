import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/ui/logo";
import { getClassroomLesson } from "./_data";
import { ElapsedTimer } from "./_components/elapsed-timer";
import { ClassroomShell } from "./_components/classroom-shell";
import { LiveClassroom } from "./_live/live-classroom";
import { API_URL } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("classroom.page");
  return { title: t("metaTitle") };
}

export default async function ClassroomPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  // Connected to the API: the real Daily.co classroom. Otherwise the design demo below.
  if (API_URL) return <LiveClassroom bookingId={lessonId} />;
  const lesson = getClassroomLesson(lessonId);
  const t = await getTranslations("classroom.page");

  return (
    <div className="flex min-h-dvh flex-col bg-navy-deep text-white lg:h-dvh">
      {/* Top bar */}
      <header className="flex min-h-[72px] shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/8 px-4 py-3 sm:px-7">
        <Link href="/student" aria-label={t("backToDashboard")} className="shrink-0 rounded-md">
          <LogoMark size={34} onDark />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold">{lesson.title}</h1>
          <p className="truncate text-[13px] text-ink-soft">{t("participants", { teacher: lesson.teacher.name, student: lesson.student.name })}</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-2 text-sm" role="status">
          <span className="size-2 rounded-full bg-teal" aria-hidden="true" />
          {t("connectionGood")}
        </span>
        <ElapsedTimer durationMin={lesson.durationMin} />
      </header>

      <ClassroomShell lesson={lesson} />
    </div>
  );
}
