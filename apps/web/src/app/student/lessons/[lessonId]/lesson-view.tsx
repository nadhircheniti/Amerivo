"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useMe } from "@/components/layout/role-gate";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, StarRow, type BadgeTone } from "@/components/ui/primitives";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import { currentStudent } from "@/lib/mock-data";
import { useApi } from "@/lib/use-api";
import { CancelLesson, RefundOutcome } from "../../_components/cancel-lesson";
import { useDueLabel, useToggleHomework } from "../../_components/homework-list";
import { JoinButton } from "../../_components/join-button";
import { Modal } from "../../_components/modal";
import { Loadable } from "../../_components/states";
import { demoLesson } from "../../_lib/demo";
import { fullName, useFormat } from "../../_lib/format";
import type { BookingStatus, Dispute, HomeworkStatus, LessonDetail } from "../../_lib/types";
import { useNow, useStudentData } from "../../_lib/use-student-data";
import { statusTone } from "../lessons-view";
import { ReviewForm } from "./review-form";

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-white/8 px-4 py-3.5">
      <h2 className="font-sans text-[13px] font-bold tracking-wide text-yellow uppercase">{label}</h2>
      <p className="mt-0.5 text-[15px] leading-normal whitespace-pre-line">{children}</p>
    </div>
  );
}

export function LessonView({ lessonId }: { lessonId: string }) {
  const t = useTranslations("student");
  const state = useStudentData<LessonDetail>(`/student/lessons/${lessonId}`, () => demoLesson(lessonId));
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <Link href="/student/lessons" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-teal-dark hover:text-navy">
        <Icon name="chevronLeft" size={16} strokeWidth={2} />
        {t("lesson.backToLessons")}
      </Link>
      <Loadable state={state}>{(l) => <Lesson l={l} update={(fn) => state.setData((p) => (p ? fn(p) : p))} />}</Loadable>
    </div>
  );
}

function Lesson({ l, update }: { l: LessonDetail; update: (fn: (l: LessonDetail) => LessonDetail) => void }) {
  const t = useTranslations("student");
  const f = useFormat();
  const now = useNow();
  const me = useMe();
  const studentName = me?.firstName ?? (API_URL ? "" : currentStudent.firstName);
  const done = l.status === "completed" || l.status === "no_show";
  const upcoming = l.status === "confirmed" || l.status === "pending_payment";
  const r = l.report;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-[28px] bg-navy p-6 text-white sm:p-8" aria-labelledby="summary-title">
        <span className="font-display text-xs font-semibold tracking-[3px] text-yellow uppercase">{done ? t("lesson.eyebrow") : t("lesson.eyebrowLesson")}</span>
        <h1 id="summary-title" className="text-[26px] font-bold text-white">
          {r ? (studentName ? t("lesson.niceWork", { name: studentName }) : t("lesson.niceWorkNoName")) : t(`lessons.withFull.${l.type}`, { name: fullName(l.teacher) })}
        </h1>
        <p className="text-sm text-ink-soft">
          {l.topic || r?.topicsCovered
            ? t("lesson.meta", { teacher: fullName(l.teacher), date: f.date(l.startsAt), minutes: l.durationMin, topic: r?.topicsCovered || l.topic || "" })
            : t("lesson.metaNoTopic", { teacher: fullName(l.teacher), date: f.date(l.startsAt), minutes: l.durationMin })}
          {" · "}
          <bdi dir="ltr">{f.range(l.startsAt, l.endsAt)}</bdi>
        </p>
        <div>
          <Badge tone={statusTone[l.status]}>{t(`lessons.status.${l.status as BookingStatus}`)}</Badge>
        </div>

        {r ? (
          <div className="flex flex-col gap-3">
            {r.homework && <Block label={r.homeworkDue ? t("lesson.homeworkDue", { date: f.calendarDay(r.homeworkDue) }) : t("lesson.homework")}>{r.homework}</Block>}
            {r.recommendation && <Block label={t("lesson.nextRecommendation")}>{r.recommendation}</Block>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Block label={t("lesson.strengths")}>{r.strengths || "—"}</Block>
              <Block label={t("lesson.toWorkOn")}>{r.developmentAreas || "—"}</Block>
            </div>
          </div>
        ) : done ? (
          <p className="rounded-[14px] bg-white/8 px-4 py-3.5 text-[15px]">{t("lesson.noReport", { name: l.teacher.firstName })}</p>
        ) : upcoming ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start gap-3">
              <JoinButton booking={l} now={now} size="md" variant="primary" hintClassName="text-ink-soft" />
            </div>
            {l.canCancel && (
              <div className="flex flex-col gap-3 rounded-[14px] bg-white p-4 text-navy">
                <RefundOutcome booking={l} />
                <CancelLesson
                  booking={l}
                  className="self-start"
                  onCancelled={(res) => update((x) => ({ ...x, status: res.status as BookingStatus, canCancel: false, cancellation: null, cancelledBy: "student" }))}
                />
              </div>
            )}
          </div>
        ) : null}
      </section>

      <div className="flex flex-col gap-5">
        {done && (
          <Card className="flex flex-col gap-[18px] rounded-[28px] p-6 sm:p-8">
            <h2 className="text-[22px] font-bold">{t("lesson.howWas", { name: l.teacher.firstName })}</h2>
            {l.review ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-teal-50 p-5">
                <StarRow count={l.review.rating} size={20} />
                {l.review.comment && <p className="text-sm leading-relaxed whitespace-pre-line text-navy-soft">{l.review.comment}</p>}
                <p className="text-xs text-muted">{t("lesson.reviewedOn", { date: f.date(l.review.createdAt) })}</p>
              </div>
            ) : l.status === "completed" ? (
              <ReviewForm
                teacherFirstName={l.teacher.firstName}
                bookingId={l.id}
                onSubmitted={(rv) => update((x) => ({ ...x, myReview: { rating: rv.rating }, canReview: false }))}
              />
            ) : (
              <p className="text-sm text-navy-soft">{t("lesson.noReviewNoShow")}</p>
            )}
            <div className="flex flex-col gap-3 border-t border-line-soft pt-[18px] sm:flex-row">
              <ButtonLink href={`/teachers/${l.teacher.slug}`} variant="outline" className="flex-1">
                {t("lesson.bookNext", { name: l.teacher.firstName })}
              </ButtonLink>
              <ButtonLink href="/teachers" variant="outlineLight" className="flex-1 font-semibold">
                {t("lesson.tryAnother")}
              </ButtonLink>
            </div>
          </Card>
        )}

        {l.homework.length > 0 && <LessonHomework l={l} update={update} now={now} />}

        {done && <ProblemReport l={l} onCreated={(d) => update((x) => ({ ...x, dispute: d, canDispute: false }))} />}

        {!done && !upcoming && (
          <Card className="flex flex-col gap-3 rounded-[28px] p-6 sm:p-8">
            <p className="text-sm text-navy-soft">{t("lesson.cancelledText")}</p>
            <ButtonLink href={`/teachers/${l.teacher.slug}`} variant="outline" className="self-start">
              {t("lessons.bookAgain")}
            </ButtonLink>
          </Card>
        )}
      </div>
    </div>
  );
}

function LessonHomework({ l, update, now }: { l: LessonDetail; update: (fn: (l: LessonDetail) => LessonDetail) => void; now: number | null }) {
  const t = useTranslations("student.homework");
  const dueLabel = useDueLabel();
  const onChange = useCallback(
    (id: string, status: HomeworkStatus) => update((x) => ({ ...x, homework: x.homework.map((h) => (h.id === id ? { ...h, status } : h)) })),
    [update],
  );
  const { toggle, busy, error } = useToggleHomework(onChange);
  return (
    <Card className="flex flex-col gap-3.5 rounded-[28px] p-6 sm:p-8">
      <h2 className="text-[19px] font-bold">{t("fromThisLesson")}</h2>
      <ul className="flex flex-col gap-3">
        {l.homework.map((hw) => {
          const checked = hw.status === "completed";
          const due = now === null ? null : dueLabel(hw.dueDate, now);
          return (
            <li key={hw.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-beige p-3.5">
                <input type="checkbox" checked={checked} disabled={busy === hw.id} onChange={(e) => toggle(hw, e.target.checked)} className="mt-0.5 size-[18px] shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className={cn("text-[15px] font-semibold whitespace-pre-line", checked && "text-muted line-through")}>{hw.description}</span>
                  <span className={cn("text-[13px]", due?.urgent && !checked ? "text-orange-text" : "text-muted")}>{checked ? t("completed") : due?.text}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="text-sm text-danger-text" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

const disputeTone: Record<Dispute["status"], BadgeTone> = { open: "warning", refunded: "success", rejected: "neutral" };

/** "Report a problem" within 24 h after the lesson → POST /bookings/:id/dispute (reviewed by an admin). */
function ProblemReport({ l, onCreated }: { l: LessonDetail; onCreated: (d: Dispute) => void }) {
  const t = useTranslations("student.dispute");
  const f = useFormat();
  const { call } = useApi();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = reason.trim().length < 10;

  if (l.dispute) {
    const d = l.dispute;
    return (
      <Card className="flex flex-col gap-3 rounded-[28px] p-6 sm:p-8" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[19px] font-bold">{t("reportedTitle")}</h2>
          <Badge tone={disputeTone[d.status]}>{t(`status.${d.status}`)}</Badge>
        </div>
        <p className="text-sm text-navy-soft">{t(`statusText.${d.status}`)}</p>
        <blockquote className="rounded-[14px] bg-beige p-3.5 text-sm whitespace-pre-line">{d.reason}</blockquote>
        {d.resolution && <p className="text-sm text-navy-soft">{t("resolution", { text: d.resolution })}</p>}
        <p className="text-xs text-muted">{t("sentOn", { date: f.date(d.createdAt) })}</p>
      </Card>
    );
  }
  if (!l.canDispute) return null;

  const submit = async () => {
    if (tooShort) return;
    setBusy(true);
    setError(null);
    try {
      const d = API_URL
        ? await call<Dispute>(`/bookings/${l.id}/dispute`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) })
        : { id: "demo-dispute", bookingId: l.id, status: "open" as const, reason: reason.trim(), createdAt: new Date().toISOString() };
      setOpen(false);
      onCreated(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3 rounded-[28px] p-6 sm:p-8">
      <h2 className="text-[19px] font-bold">{t("title")}</h2>
      <p className="text-sm text-navy-soft">{t("intro", { date: f.dayShort(l.disputeUntil), time: f.time(l.disputeUntil) })}</p>
      <Button variant="dangerOutline" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <Icon name="shield" size={16} />
        {t("button")}
      </Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={t("dialogTitle")}>
        <p className="text-sm text-navy-soft">{t("dialogText")}</p>
        <Field label={t("reason")} hint={t("reasonHint")}>
          <Textarea rows={5} minLength={10} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
        </Field>
        {error && (
          <p className="text-sm text-danger-text" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outlineLight" onClick={() => setOpen(false)} disabled={busy}>
            {t("back")}
          </Button>
          <Button variant="danger" onClick={submit} disabled={busy || tooShort}>
            {busy ? t("sending") : t("send")}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
