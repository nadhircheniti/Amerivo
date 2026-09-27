"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Badge, StarRow, type BadgeTone } from "@/components/ui/primitives";
import { CancelLesson, type CancelResult } from "../_components/cancel-lesson";
import { JoinButton } from "../_components/join-button";
import { Modal } from "../_components/modal";
import { EmptyState, Loadable, PageHeader } from "../_components/states";
import { TeacherAvatar } from "../_components/teacher-avatar";
import { demoPast, demoUpcoming } from "../_lib/demo";
import { fullName, useFormat } from "../_lib/format";
import type { BookingStatus, StudentBooking } from "../_lib/types";
import { useNow, useStudentData } from "../_lib/use-student-data";
import { ReviewForm } from "./[lessonId]/review-form";

type Scope = "upcoming" | "past";

export const statusTone: Record<BookingStatus, BadgeTone> = {
  pending_payment: "warning",
  confirmed: "success",
  completed: "info",
  cancelled: "neutral",
  refunded: "neutral",
  no_show: "danger",
};

export function LessonsView() {
  const t = useTranslations("student.lessons");
  const [scope, setScope] = useState<Scope>("upcoming");
  const [notice, setNotice] = useState<string | null>(null);
  const f = useFormat();
  const upcoming = useStudentData<StudentBooking[]>("/student/lessons?scope=upcoming", () => demoUpcoming());
  const past = useStudentData<StudentBooking[]>(scope === "past" ? "/student/lessons?scope=past" : null, () => demoPast());
  const state = scope === "upcoming" ? upcoming : past;
  const now = useNow();

  const onCancelled = useCallback(
    (b: StudentBooking, r: CancelResult) => {
      upcoming.setData((rows) => rows?.filter((x) => x.id !== b.id) ?? null);
      past.setData((rows) => (rows ? [{ ...b, status: r.status as BookingStatus, canCancel: false, cancellation: null, cancelledBy: "student" }, ...rows] : rows));
      setNotice(
        r.refundMode === "money" && r.refundCents > 0
          ? t("cancelled.money", { amount: f.money(r.refundCents) })
          : r.refundMode === "package_credit"
            ? t("cancelled.packageCredit")
            : t("cancelled.none"),
      );
    },
    [upcoming, past, t, f],
  );

  const onReviewed = useCallback((id: string, rating: number) => past.setData((rows) => rows?.map((x) => (x.id === id ? { ...x, myReview: { rating }, canReview: false } : x)) ?? null), [past]);

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader title={t("title")} description={t("description")}>
        <ButtonLink href="/teachers">{t("bookLesson")}</ButtonLink>
      </PageHeader>

      <Segmented
        label={t("tabsLabel")}
        value={scope}
        onChange={(v) => {
          setScope(v);
          setNotice(null);
        }}
        options={[
          { value: "upcoming", label: t("tabs.upcoming") },
          { value: "past", label: t("tabs.past") },
        ]}
        className="max-w-sm"
      />

      {notice && (
        <p role="status" className="flex items-center gap-3 rounded-2xl bg-teal-100 px-5 py-4 text-[15px] font-semibold text-teal-deep">
          <Icon name="check" size={20} strokeWidth={2.4} />
          {notice}
        </p>
      )}

      <Loadable state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title={scope === "upcoming" ? t("empty.upcomingTitle") : t("empty.pastTitle")}
              text={scope === "upcoming" ? t("empty.upcomingText") : t("empty.pastText")}
              action={
                <ButtonLink href="/teachers" size="sm">
                  {t("findTeacher")}
                </ButtonLink>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3.5">
              {rows.map((b) => (
                <LessonCard key={b.id} b={b} now={now} onCancelled={onCancelled} onReviewed={onReviewed} />
              ))}
            </ul>
          )
        }
      </Loadable>
      <p className="text-xs text-muted">{t("timeZoneNote", { tz: f.tz })}</p>
    </div>
  );
}

function LessonCard({
  b,
  now,
  onCancelled,
  onReviewed,
}: {
  b: StudentBooking;
  now: number | null;
  onCancelled: (b: StudentBooking, r: CancelResult) => void;
  onReviewed: (id: string, rating: number) => void;
}) {
  const t = useTranslations("student.lessons");
  const f = useFormat();
  const [reviewing, setReviewing] = useState(false);
  const done = b.status === "completed" || b.status === "no_show";
  const cancelledLabel = b.cancelledBy === "teacher" ? t("cancelledByTeacher") : b.cancelledBy === "admin" ? t("cancelledByAdmin") : null;

  return (
    <li className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="w-14 shrink-0 text-center">
          <p className="text-xs text-muted uppercase">{f.weekday(b.startsAt)}</p>
          <p className="font-display text-[24px] leading-tight font-extrabold">{f.dayOfMonth(b.startsAt)}</p>
          <p className="text-xs text-muted">{f.monthShort(b.startsAt)}</p>
        </div>
        <TeacherAvatar teacher={b.teacher} size={48} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold">
            {done ? (
              <Link href={`/student/lessons/${b.id}`} className="hover:text-teal-dark">
                {t(`withFull.${b.type}`, { name: fullName(b.teacher) })}
              </Link>
            ) : (
              t(`withFull.${b.type}`, { name: fullName(b.teacher) })
            )}
          </p>
          <p className="text-sm text-muted">
            <bdi dir="ltr">{f.range(b.startsAt, b.endsAt)}</bdi> · {t("minutes", { count: b.durationMin })}
            {b.topic ? ` · ${b.topic}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[b.status]}>{t(`status.${b.status}`)}</Badge>
            {cancelledLabel && <span className="text-xs text-muted">{cancelledLabel}</span>}
            {b.hasReport && (
              <Badge tone="lilac">
                <Icon name="file" size={12} />
                {t("reportReady")}
              </Badge>
            )}
            {b.myReview && <StarRow count={b.myReview.rating} size={14} />}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
        <JoinButton booking={b} now={now} />
        {b.canCancel && <CancelLesson booking={b} onCancelled={(r) => onCancelled(b, r)} />}
        {done && (
          <ButtonLink href={`/student/lessons/${b.id}`} size="sm" variant="outlineLight">
            {b.hasReport ? t("viewReport") : t("details")}
          </ButtonLink>
        )}
        {b.canReview && (
          <>
            <Button size="sm" variant="outline" onClick={() => setReviewing(true)}>
              <Icon name="star" size={16} />
              {t("review")}
            </Button>
            <Modal open={reviewing} onClose={() => setReviewing(false)} title={t("reviewTitle", { name: b.teacher.firstName })}>
              <ReviewForm teacherFirstName={b.teacher.firstName} bookingId={b.id} onSubmitted={(r) => onReviewed(b.id, r.rating)} />
            </Modal>
          </>
        )}
        {b.status !== "confirmed" && b.status !== "pending_payment" && (
          <ButtonLink href={`/teachers/${b.teacher.slug}`} size="sm" variant="ghost">
            {t("bookAgain")}
          </ButtonLink>
        )}
      </div>
    </li>
  );
}
