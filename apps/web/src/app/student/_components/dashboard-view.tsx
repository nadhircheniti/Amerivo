"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatTile } from "@/components/ui/primitives";
import { NotificationBell } from "@/components/messaging/notification-bell";
import { cn } from "@/lib/cn";
import { demoOverview } from "../_lib/demo";
import { fullName, useFormat } from "../_lib/format";
import type { Overview, PaymentRow, StudentBooking } from "../_lib/types";
import { useNow, useStudentData } from "../_lib/use-student-data";
import { HomeworkList } from "./homework-list";
import { JoinButton } from "./join-button";
import { Loadable } from "./states";
import { TeacherAvatar } from "./teacher-avatar";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function Panel({ title, action, children, id }: { title: string; id: string; action?: { href: string; label: string }; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-[19px] font-bold">
          {title}
        </h2>
        {action && (
          <Link href={action.href} className="text-sm font-semibold text-teal-dark hover:text-navy">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-white/70" />
      <div className="h-[150px] animate-pulse rounded-3xl bg-navy/15" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[118px] animate-pulse rounded-[20px] bg-white/70" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
    </div>
  );
}

export function DashboardView() {
  const state = useStudentData<Overview>("/student/overview", () => demoOverview());
  const booked = useSearchParams().get("booked");
  const t = useTranslations("student.overview");
  return (
    <div className="mx-auto flex max-w-[1176px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      {booked && (
        <p role="status" className="flex items-center gap-3 rounded-2xl bg-teal-100 px-5 py-4 text-[15px] font-semibold text-teal-deep">
          <Icon name="check" size={20} strokeWidth={2.4} />
          {t("booked")}
        </p>
      )}
      <Loadable state={state} skeleton={<Skeleton />}>
        {(o) => <Dashboard o={o} />}
      </Loadable>
    </div>
  );
}

function Dashboard({ o }: { o: Overview }) {
  const t = useTranslations("student.overview");
  const tl = useTranslations("student.lessons");
  const now = useNow();
  const f = useFormat(o.timezone);
  const hour = now === null ? 12 : f.hourNow();
  const greeting = hour < 5 ? "evening" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const next = o.nextLesson;
  const others = o.upcoming.filter((b) => b.id !== next?.id);
  const plan = o.activePackages[0];
  const levelIdx = o.level.current ? CEFR.indexOf(o.level.current) : -1;

  return (
    <>
      {/* Greeting */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-extrabold sm:text-[30px]">{t(`greeting.${greeting}`, { name: o.firstName })}</h1>
          <p className="mt-1 text-[15px] text-muted">
            {o.level.target && o.level.target !== o.level.current ? t("encouragement", { level: o.level.target }) : t("encouragementGeneric")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <ButtonLink href="/teachers">{t("bookLesson")}</ButtonLink>
        </div>
      </div>

      {/* Next lesson */}
      <section
        className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-navy px-6 py-7 text-white sm:flex-row sm:items-center sm:gap-7 sm:px-[34px] sm:py-[30px]"
        aria-labelledby="next-lesson"
      >
        <div className="pointer-events-none absolute -top-20 -end-[60px] size-[260px] rounded-full bg-teal opacity-[0.22]" aria-hidden="true" />
        {next ? (
          <>
            <TeacherAvatar teacher={next.teacher} size={76} />
            <div className="relative flex flex-1 flex-col gap-1.5">
              <span className="font-display text-xs font-semibold tracking-[3px] text-yellow uppercase">
                <NextEyebrow booking={next} now={now} />
              </span>
              <h2 id="next-lesson" className="text-[22px] font-bold text-white sm:text-[26px]">
                {tl(`with.${next.type}`, { name: next.teacher.firstName })}
              </h2>
              <p className="text-[15px] text-ink-soft">
                {next.topic
                  ? t("nextLesson.details", { day: f.dayShort(next.startsAt), time: `⁦${f.range(next.startsAt, next.endsAt)}⁩`, topic: next.topic })
                  : t("nextLesson.detailsNoTopic", { day: f.dayShort(next.startsAt), time: `⁦${f.range(next.startsAt, next.endsAt)}⁩` })}
              </p>
            </div>
            <div className="relative shrink-0">
              <JoinButton booking={next} now={now} size="lg" variant="primary" className="px-7" hintClassName="text-ink-soft" timeZone={o.timezone} />
            </div>
          </>
        ) : (
          <>
            <div className="relative flex flex-1 flex-col gap-1.5">
              <span className="font-display text-xs font-semibold tracking-[3px] text-yellow uppercase">{t("nextLesson.eyebrowNone")}</span>
              <h2 id="next-lesson" className="text-[22px] font-bold text-white sm:text-[26px]">
                {t("nextLesson.noneTitle")}
              </h2>
              <p className="text-[15px] text-ink-soft">{t("nextLesson.noneText")}</p>
            </div>
            <ButtonLink href="/teachers" size="lg" className="relative shrink-0 px-7">
              {t("nextLesson.findTeacher")}
            </ButtonLink>
          </>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("stats.label")}>
        <StatTile
          label={t("stats.hoursStudied")}
          value={f.num(o.hoursStudied, 1)}
          hint={o.hoursThisMonth > 0 ? t("stats.hoursHint", { hours: f.num(o.hoursThisMonth, 1) }) : t("stats.hoursNone")}
          hintClassName={o.hoursThisMonth > 0 ? "text-teal-dark" : undefined}
        />
        <StatTile
          label={t("stats.lessonsCompleted")}
          value={f.num(o.lessonsCompleted)}
          hint={o.teachersCount > 0 ? t("stats.withTeachers", { count: o.teachersCount }) : t("stats.noLessonsYet")}
        />
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-white p-[22px]">
          <span className="text-sm text-muted">{t("stats.levelProgress")}</span>
          {o.level.current ? (
            <>
              <div className="flex justify-between font-display text-[22px] font-extrabold">
                <span>{o.level.current}</span>
                {o.level.target && o.level.target !== o.level.current && <span className="text-muted">{o.level.target}</span>}
              </div>
              <div className="flex gap-1" role="img" aria-label={t("stats.levelScaleAria", { level: o.level.current })}>
                {CEFR.map((l, i) => (
                  <span key={l} className={cn("h-2 flex-1 rounded-md", i <= levelIdx ? "bg-teal-dark" : "bg-line-soft")} />
                ))}
              </div>
              <span className="text-[12px] text-muted" aria-hidden="true">
                A1 · A2 · B1 · B2 · C1 · C2
              </span>
            </>
          ) : (
            <>
              <span className="font-display text-[22px] font-extrabold">—</span>
              <Link href="/onboarding/goals" className="text-[13px] font-semibold text-teal-dark hover:text-navy">
                {t("stats.takeTest")}
              </Link>
            </>
          )}
        </div>
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-white p-[22px]">
          <span className="text-sm text-muted">{t("stats.currentPlan")}</span>
          {plan ? (
            <>
              <span className="font-display text-[22px] font-extrabold">{t("stats.pack", { count: plan.lessonCount })}</span>
              <span className="text-[13px] text-muted">{t("stats.lessonsLeftWith", { count: plan.remaining, name: plan.teacher.firstName })}</span>
              {o.activePackages.length > 1 && (
                <Link href="/student/payments" className="text-[13px] font-semibold text-teal-dark hover:text-navy">
                  {t("stats.morePacks", { count: o.activePackages.length - 1 })}
                </Link>
              )}
            </>
          ) : (
            <>
              <span className="font-display text-[22px] font-extrabold">{t("stats.payAsYouGo")}</span>
              <span className="text-[13px] text-muted">{t("stats.noPack")}</span>
            </>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={t("upcoming.title")} id="upcoming" action={{ href: "/student/lessons", label: t("upcoming.viewAll") }}>
          {others.length === 0 ? (
            <p className="rounded-2xl bg-beige p-4 text-sm text-navy-soft">{next ? t("upcoming.noOthers") : t("upcoming.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {others.map((l) => (
                <UpcomingRow key={l.id} l={l} now={now} timeZone={o.timezone} />
              ))}
            </ul>
          )}
          {o.lastTeacher && (
            <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-dashed border-teal p-4">
              <p className="min-w-[200px] flex-1 text-sm text-navy-soft">
                {t.rich("upcoming.nextTeacher", { name: o.lastTeacher.firstName, strong: (c) => <strong className="text-navy">{c}</strong> })}
              </p>
              <Link href={`/teachers/${o.lastTeacher.slug}`} className="text-sm font-semibold text-teal-dark hover:text-navy">
                {t("upcoming.bookName", { name: o.lastTeacher.firstName })}
              </Link>
              <Link href="/teachers" className="text-sm font-semibold text-teal-dark hover:text-navy">
                {t("upcoming.browse")}
              </Link>
            </div>
          )}
        </Panel>

        <HomeworkList items={o.homework} doneCount={o.homeworkCounts.done} now={now} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title={t("lastLesson.title")}
          id="last-lesson"
          action={o.lastReport ? { href: `/student/lessons/${o.lastReport.bookingId}`, label: t("lastLesson.openReport") } : undefined}
        >
          {o.lastReport ? (
            <>
              <p className="text-sm text-muted">
                {f.date(o.lastReport.date)} · {fullName(o.lastReport.teacher)} · {o.lastReport.topicsCovered}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] bg-teal-50 p-4">
                  <h3 className="mb-1.5 font-sans text-sm font-semibold">{t("lastLesson.strengths")}</h3>
                  <p className="text-sm leading-normal whitespace-pre-line text-navy-soft">{o.lastReport.strengths || "—"}</p>
                </div>
                <div className="rounded-[14px] bg-cream p-4">
                  <h3 className="mb-1.5 font-sans text-sm font-semibold">{t("lastLesson.toWorkOn")}</h3>
                  <p className="text-sm leading-normal whitespace-pre-line text-navy-soft">{o.lastReport.developmentAreas || "—"}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-2xl bg-beige p-4 text-sm text-navy-soft">{t("lastLesson.empty")}</p>
          )}
        </Panel>

        <Panel title={t("payments.title")} id="payments" action={{ href: "/student/payments", label: t("payments.allPayments") }}>
          {o.recentPayments.length === 0 ? (
            <p className="rounded-2xl bg-beige p-4 text-sm text-navy-soft">{t("payments.empty")}</p>
          ) : (
            <ul className="flex flex-col">
              {o.recentPayments.map((p) => (
                <PaymentLine key={p.id} p={p} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function NextEyebrow({ booking, now }: { booking: StudentBooking; now: number | null }) {
  const t = useTranslations("student.overview.nextLesson");
  const f = useFormat();
  if (now === null) return <>{t("eyebrowPlain")}</>;
  const start = new Date(booking.startsAt).getTime();
  const end = new Date(booking.endsAt).getTime();
  if (now >= start && now <= end) return <>{t("eyebrowNow")}</>;
  const minutes = Math.max(1, Math.round((start - now) / 60_000));
  if (minutes <= 90) return <>{t("eyebrow", { minutes })}</>;
  if (f.dayShort(start) === f.dayShort(now)) return <>{t("eyebrowToday")}</>;
  return <>{t("eyebrowPlain")}</>;
}

function UpcomingRow({ l, now, timeZone }: { l: StudentBooking; now: number | null; timeZone: string }) {
  const t = useTranslations("student.overview.upcoming");
  const tl = useTranslations("student.lessons");
  const f = useFormat(timeZone);
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-2xl bg-beige p-3.5">
      <div className="w-14 text-center">
        <p className="text-xs text-muted uppercase">{f.weekday(l.startsAt)}</p>
        <p className="font-display text-[22px] font-extrabold">{f.dayOfMonth(l.startsAt)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{tl(`withFull.${l.type}`, { name: fullName(l.teacher) })}</p>
        <p className="text-sm text-muted">
          <bdi dir="ltr">{f.range(l.startsAt, l.endsAt)}</bdi>
          {l.topic ? ` · ${l.topic}` : ""}
          {l.status === "pending_payment" ? ` · ${tl("status.pending_payment")}` : ""}
        </p>
      </div>
      <JoinButton booking={l} now={now} timeZone={timeZone} />
      <Link
        href="/student/lessons"
        className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm text-navy hover:bg-beige"
        aria-label={t("manageAria", { name: fullName(l.teacher), date: f.dayLong(l.startsAt) })}
      >
        {t("manage")}
      </Link>
    </li>
  );
}

function PaymentLine({ p }: { p: PaymentRow }) {
  const t = useTranslations("student.overview.payments");
  const f = useFormat();
  const teacher = p.teacher?.firstName ?? "—";
  const label = "lessonCount" in p.what ? t("pack", { count: p.what.lessonCount, teacher }) : t(p.what.kind, { teacher });
  return (
    <li className="flex justify-between gap-3 border-b border-line-soft py-2.5 text-sm last:border-b-0">
      <span>{label}</span>
      <span className="text-end font-semibold">
        {p.amountCents === 0 ? t("free") : f.money(p.amountCents)}
        {p.refundedCents > 0 && <span className="block text-xs font-normal text-muted">{t("refunded", { amount: f.money(p.refundedCents) })}</span>}
      </span>
    </li>
  );
}
