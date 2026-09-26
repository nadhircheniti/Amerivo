import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { getClassroomLesson } from "./_data";
import { ElapsedTimer } from "./_components/elapsed-timer";
import { ClassroomShell } from "./_components/classroom-shell";

export const metadata: Metadata = { title: "Live lesson" };

export default async function ClassroomPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getClassroomLesson(lessonId);

  return (
    <div className="flex min-h-dvh flex-col bg-navy-deep text-white lg:h-dvh">
      {/* Top bar */}
      <header className="flex min-h-[72px] shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/8 px-4 py-3 sm:px-7">
        <Link href="/student" aria-label="Back to dashboard" className="shrink-0 rounded-md">
          <LogoMark size={34} onDark />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold">{lesson.title}</h1>
          <p className="truncate text-[13px] text-ink-soft">
            {lesson.teacher.name} &amp; {lesson.student.name}
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-2 text-sm" role="status">
          <span className="size-2 rounded-full bg-teal" aria-hidden="true" />
          Connection good
        </span>
        <ElapsedTimer durationMin={lesson.durationMin} />
      </header>

      <ClassroomShell lesson={lesson} />
    </div>
  );
}
