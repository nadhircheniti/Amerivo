"use client";

import { useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/primitives";
import { useApi } from "@/lib/use-api";
import { LoadState, useLoad } from "../../../../_components/use-load";
import type { ReportDraft, ReportLesson } from "../_data";
import { ReportForm, type ReportLive } from "./report-form";

type Attendance = "attended" | "late" | "no_show";
type LessonContext = {
  bookingId: string;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "refunded" | "no_show";
  startsAt: string;
  durationMin: number;
  attendance: Attendance | null;
  student: { id: string; firstName: string; lastName: string };
  history: { lessons: number; hours: number };
  canComplete: boolean;
  report: null | {
    topicsCovered: string;
    strengths: string | null;
    developmentAreas: string | null;
    homework: string | null;
    homeworkDue: string | null;
    recommendation: string | null;
    privateFluency: number | null;
    privateAccuracy: number | null;
    privateEngagement: number | null;
  };
};

const toDraft = (a: Attendance | null): ReportDraft["attendance"] => (a === "no_show" ? "no-show" : a ?? "attended");
const toApi = (a: ReportDraft["attendance"]): Attendance => (a === "no-show" ? "no_show" : a);
const localDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/** Report page on real data. `bookingId` is the id in the URL (the classroom's "End lesson" sends the teacher here). */
export function LiveReport({ bookingId }: { bookingId: string }) {
  const t = useTranslations("teacher.report");
  const { call } = useApi();
  const { data, failed, retry } = useLoad<LessonContext>(`/teacher/lessons/${encodeURIComponent(bookingId)}`);
  const draftKey = `amerivo:report-draft:${bookingId}`;
  const ended = useRef(false);

  const lesson = useMemo<ReportLesson | null>(() => {
    if (!data) return null;
    let saved: Partial<ReportDraft> | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(draftKey) ?? "null");
    } catch {
      saved = null;
    }
    const r = data.report;
    return {
      id: data.bookingId,
      student: { name: `${data.student.firstName} ${data.student.lastName}`.trim(), firstName: data.student.firstName },
      date: localDay(data.startsAt),
      durationMin: data.durationMin,
      returning: data.history,
      draft: {
        attendance: toDraft(data.attendance),
        topics: r?.topicsCovered ?? "",
        strengths: r?.strengths ?? "",
        development: r?.developmentAreas ?? "",
        homework: r?.homework ?? "",
        dueDate: r?.homeworkDue ?? "",
        recommendation: r?.recommendation ?? "",
        fluency: r?.privateFluency ?? 3,
        accuracy: r?.privateAccuracy ?? 3,
        engagement: r?.privateEngagement ?? 3,
        ...(saved && !r ? saved : {}),
        // Recorded attendance always wins over a local draft.
        ...(data.attendance ? { attendance: toDraft(data.attendance) } : {}),
      },
    };
  }, [data, draftKey]);

  const send = useCallback(
    async (r: ReportDraft) => {
      // Not ended yet (e.g. the teacher left the classroom without "End lesson"): end it with the chosen attendance.
      if (data?.status === "confirmed" && !ended.current) {
        await call(`/bookings/${encodeURIComponent(bookingId)}/complete`, { method: "POST", body: JSON.stringify({ attendance: toApi(r.attendance) }) });
        ended.current = true;
      }
      const text = (v: string) => (v.trim() ? v.trim() : undefined);
      await call(`/bookings/${encodeURIComponent(bookingId)}/report`, {
        method: "PUT",
        body: JSON.stringify({
          topicsCovered: r.topics.trim(),
          strengths: text(r.strengths),
          developmentAreas: text(r.development),
          homework: text(r.homework),
          homeworkDue: r.dueDate || undefined,
          recommendation: text(r.recommendation),
          privateFluency: r.fluency,
          privateAccuracy: r.accuracy,
          privateEngagement: r.engagement,
        }),
      });
    },
    [call, bookingId, data?.status],
  );

  if (!data || !lesson) return <LoadState failed={failed} onRetry={retry} title={t("title")} className="mx-auto max-w-[640px]" />;

  const notYet = data.status === "confirmed" && !data.canComplete;
  const noReport = data.status === "cancelled" || data.status === "refunded" || data.status === "pending_payment";
  if (notYet || noReport) {
    return (
      <Card className="mx-auto flex max-w-[640px] flex-col items-center gap-4 rounded-[28px] p-10 text-center" role="status">
        <span className="flex size-16 items-center justify-center rounded-full bg-beige text-teal-dark">
          <Icon name={notYet ? "clock" : "x"} size={30} strokeWidth={2.2} />
        </span>
        <h1 className="text-[26px] font-extrabold">{notYet ? t("notYetTitle") : t("cancelledTitle")}</h1>
        <p className="text-[15px] text-muted">{notYet ? t("notYetBody", { name: data.student.firstName }) : t("cancelledBody")}</p>
        <ButtonLink href="/teacher" variant="teal" className="mt-2">
          {t("back")}
        </ButtonLink>
      </Card>
    );
  }

  const live: ReportLive = { attendanceLocked: data.status !== "confirmed", send, draftKey };
  return <ReportForm lesson={lesson} live={live} />;
}
