"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LiveLessons } from "@/app/student/_components/live-lessons";
import { ButtonLink } from "@/components/ui/button";
import { fileSrc } from "@/components/ui/file-upload";
import { Icon } from "@/components/ui/icon";
import { Avatar, Badge, StatTile } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/mock-data";
import { LoadState, initialsOf, toneOf, useLoad } from "./use-load";
import { NotificationBell } from "@/components/messaging/notification-bell";
import { VacationToggle } from "./vacation-toggle";

type Person = { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
export type Overview = {
  firstName: string;
  timezone: string;
  now: string;
  today: {
    bookingId: string;
    startsAt: string;
    durationMin: number;
    /** When the classroom opens (API rule: a few minutes before the start). Older APIs don't send it. */
    opensAt?: string;
    type: "trial" | "single" | "package";
    status: "confirmed" | "completed" | "no_show";
    topic: string | null;
    student: Person & { country: string | null; level: string | null; goal: string | null };
    history: { lessons: number; hours: number; lastLessonAt: string | null; lastNote: string | null };
  }[];
  upcomingCount: number;
  nextLessonAt: string | null;
  earnings: { monthPendingCents: number; monthNetCents: number; unpaidCents: number; nextPayoutDate: string };
  students: { active: number; total: number; newThisWeek: number; recent: Person[] };
  rating: { avgX100: number; count: number };
  cancellations: { thisMonth: number; byTeacher: number; lessonsThisMonth: number };
  reportsToWrite: { bookingId: string; startsAt: string; student: Person }[];
  notifications: { id: string; type: string; title: string; body: string | null; readAt: string | null; createdAt: string }[];
};

const sr = (c: React.ReactNode) => <span className="sr-only">{c}</span>;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Dashboard on real data (GET /teacher/overview), same layout as the sample one. */
export function LiveDashboard() {
  const t = useTranslations("teacher.dashboard");
  const tl = useTranslations("teacher.live");
  const tr = useTranslations("common.rating");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const { data, failed, retry } = useLoad<Overview>("/teacher/overview");
  // Ticks every 15 s so "Start lesson" appears when the classroom opens (the API checks it again).
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-extrabold sm:text-[30px]">{tl("dashboardTitle")}</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <VacationToggle />
          </div>
        </header>
        <LoadState failed={failed} onRetry={retry} />
      </div>
    );
  }

  const tz = data.timezone;
  const now = new Date(data.now).getTime();
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { timeZone: tz, ...opts }).format(new Date(iso));
  const time = (iso: string) => fmt(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
  const shortDate = (iso: string) => fmt(iso, { month: "short", day: "numeric" });
  const num = (n: number) => n.toLocaleString(tag);
  const tzName =
    new Intl.DateTimeFormat(tag, { timeZone: tz, timeZoneName: "long" }).formatToParts(new Date(data.now)).find((p) => p.type === "timeZoneName")?.value ?? tz;

  // The lesson to start: the first one not finished yet.
  const current = data.today.find((l) => l.status === "confirmed" && new Date(l.startsAt).getTime() + l.durationMin * 60_000 > now);
  const nextToday = data.today.find((l) => l.status === "confirmed" && new Date(l.startsAt).getTime() > now);
  const toWrite = new Set(data.reportsToWrite.map((r) => r.bookingId));
  const rating = data.rating.count ? num(Math.round(data.rating.avgX100 / 10) / 10) : tr("new");
  const recent = data.students.recent;
  const more = Math.max(0, data.students.total - recent.length);

  const noteText = (body: string | null) => (body && ISO.test(body) && !Number.isNaN(Date.parse(body)) ? fmt(body, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : body);
  const dot = (type: string) => (/cancel/.test(type) ? "bg-orange" : /payout/.test(type) ? "bg-sky" : /booking|confirmed/.test(type) ? "bg-teal-dark" : "bg-navy-soft");

  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("greeting", { name: data.firstName, count: data.today.length })}</h1>
          <p className="mt-1 text-[15px] text-muted">{tl("dateLine", { date: fmt(data.now, { weekday: "long", month: "long", day: "numeric" }), tz: tzName })}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <VacationToggle />
        </div>
      </header>

      <Suspense>
        <LiveLessons forTeacher />
      </Suspense>

      <section aria-label={t("keyFigures")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={t("todaysLessons")} value={num(data.today.length)} hint={nextToday ? t("nextAt", { time: time(nextToday.startsAt) }) : tl("upcoming", { count: data.upcomingCount })} />
        <StatTile
          label={t("pendingEarnings", { month: fmt(data.now, { month: "short" }) })}
          value={formatUsd(data.earnings.monthPendingCents / 100, locale).replace(/[.,]00(?!\d)/, "")}
          hint={t("paidBy", { date: new Intl.DateTimeFormat(tag, { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(data.earnings.nextPayoutDate)) })}
          hintClassName="text-teal-dark"
        />
        <StatTile label={t("activeStudents")} value={num(data.students.active)} hint={t("newThisWeek", { count: data.students.newThisWeek })} />
        <StatTile
          label={t("averageRating")}
          value={rating}
          hint={data.cancellations.thisMonth ? t("cancellations", { count: data.cancellations.thisMonth, total: data.cancellations.lessonsThisMonth }) : tl("reviews", { count: data.rating.count })}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="today-heading" className="flex flex-col gap-3.5 rounded-3xl bg-white p-5 sm:p-[26px]">
          <div className="flex items-center justify-between">
            <h2 id="today-heading" className="text-[19px] font-bold">
              {t("today")}
            </h2>
            <Link href="/teacher/availability" className="text-sm font-semibold text-teal-dark hover:text-navy">
              {t("fullSchedule")}
            </Link>
          </div>

          {data.today.length === 0 ? (
            <p className="rounded-[18px] bg-beige p-[18px] text-sm text-navy-soft">{tl("noLessonsToday", { count: data.upcomingCount })}</p>
          ) : (
            <ol className="flex flex-col gap-3.5">
              {data.today.map((l) => {
                const name = `${l.student.firstName} ${l.student.lastName}`.trim();
                const isCurrent = l === current;
                const done = l.status !== "confirmed";
                const title = [name, l.type === "trial" ? t("trialLesson") : l.topic, l.student.level].filter(Boolean).join(" · ");
                return (
                  <li key={l.bookingId} className={cn("flex flex-col gap-4 rounded-[18px] p-[18px] sm:flex-row", isCurrent ? "border-2 border-teal bg-teal-50" : "bg-beige", done && "opacity-80")}>
                    <div className="w-[70px] shrink-0">
                      <p className="font-display text-xl font-extrabold">{time(l.startsAt)}</p>
                      <p className="text-[13px] text-muted">{t("minutes", { count: l.durationMin })}</p>
                    </div>
                    <div className="flex min-w-0 grow flex-col gap-1.5">
                      <p className="flex flex-wrap items-center gap-2 text-base font-bold">
                        <Avatar initials={initialsOf(l.student.firstName, l.student.lastName)} tone={toneOf(l.student.id)} size={28} src={fileSrc(l.student.avatarUrl)} />
                        {title}
                        {done && <Badge tone={l.status === "no_show" ? "warning" : "success"}>{l.status === "no_show" ? tl("noShow") : tl("done")}</Badge>}
                      </p>
                      {l.history.lessons > 0 ? (
                        isCurrent ? (
                          <p className="flex items-start gap-2 rounded-[10px] bg-white px-2.5 py-2 text-[13px]">
                            <Icon name="repeat" size={16} strokeWidth={2} className="mt-px shrink-0 text-orange-dark" />
                            <span>
                              {t.rich("returningStudentLine", {
                                strong: (c) => <strong>{c}</strong>,
                                lessons: l.history.lessons,
                                hours: num(l.history.hours),
                                date: l.history.lastLessonAt ? shortDate(l.history.lastLessonAt) : "—",
                              })}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[13px] text-navy-soft">
                            <span className="me-1 rounded-md bg-orange-100 px-2 py-[3px] font-semibold">{t("returning")}</span>{" "}
                            {t("returningShort", { lessons: l.history.lessons, hours: num(l.history.hours) })}
                          </p>
                        )
                      ) : (
                        <p className="text-[13px] text-navy-soft">
                          <span className="me-1 rounded-md bg-sky-100 px-2 py-[3px] font-semibold">{t("newStudent")}</span> {l.student.country ?? ""}
                        </p>
                      )}
                      {isCurrent && l.history.lastNote && <p className="text-[13px] text-navy-soft">{t("lastNote", { note: l.history.lastNote })}</p>}
                    </div>
                    {isCurrent ? (
                      !l.opensAt || clock >= new Date(l.opensAt).getTime() ? (
                        <ButtonLink href={`/classroom/${l.bookingId}`} variant="teal" size="sm" className="shrink-0 self-start font-bold sm:self-center">
                          {t("startLesson")}
                        </ButtonLink>
                      ) : (
                        <span className="shrink-0 self-start rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-soft sm:self-center">
                          {t("opensAt", { time: time(l.opensAt) })}
                        </span>
                      )
                    ) : done && toWrite.has(l.bookingId) ? (
                      <Link href={`/teacher/lessons/${l.bookingId}/report`} className="self-start text-sm font-semibold text-teal-dark hover:text-navy sm:self-center">
                        {t.rich("writeReport", { sr, name })}
                      </Link>
                    ) : (
                      <Link href={`/teacher/messages?student=${l.student.id}`} className="self-start text-sm font-semibold text-teal-dark hover:text-navy sm:self-center">
                        {t.rich("message", { sr, name })}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="reports-heading" className="flex flex-col gap-3 rounded-3xl bg-cream p-6">
            <h2 id="reports-heading" className="text-[17px] font-bold">
              {t("reportsTitle")}
            </h2>
            {data.reportsToWrite.length === 0 ? (
              <p className="text-sm text-navy-soft">{tl("noReports")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.reportsToWrite.map((r) => {
                  const name = `${r.student.firstName} ${r.student.lastName}`.trim();
                  return (
                    <li key={r.bookingId} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {name} · {shortDate(r.startsAt)}
                      </span>
                      <Link href={`/teacher/lessons/${r.bookingId}/report`} className="shrink-0 font-semibold text-teal-dark hover:text-navy">
                        {t.rich("writeReport", { sr, name })}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="notif-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
            <h2 id="notif-heading" className="text-[17px] font-bold">
              {t("notificationsTitle")}
            </h2>
            {data.notifications.length === 0 ? (
              <p className="text-sm text-muted">{tl("noNotifications")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.notifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 text-sm leading-normal">
                    <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dot(n.type))} aria-hidden="true" />
                    <span className="min-w-0">
                      <strong>{n.title}</strong>
                      {n.body && <> · {noteText(n.body)}</>}
                      <span className="block text-xs text-muted">{fmt(n.createdAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="students-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 id="students-heading" className="text-[17px] font-bold">
                {t("myStudents")}
              </h2>
              <span className="text-[13px] text-muted">{t("studentsCount", { active: num(data.students.active), past: num(Math.max(0, data.students.total - data.students.active)) })}</span>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-muted">{tl("noStudents")}</p>
            ) : (
              <ul className="flex" aria-label={tl("recentStudents")}>
                {recent.map((s, i) => (
                  <li key={s.id} className={i > 0 ? "-ms-2.5" : undefined}>
                    <Avatar
                      initials={initialsOf(s.firstName, s.lastName)}
                      tone={toneOf(s.id)}
                      size={40}
                      src={fileSrc(s.avatarUrl)}
                      alt={s.avatarUrl ? `${s.firstName} ${s.lastName}`.trim() : undefined}
                      className="border-2 border-white"
                    />
                    {!s.avatarUrl && <span className="sr-only">{`${s.firstName} ${s.lastName}`.trim()}</span>}
                  </li>
                ))}
                {more > 0 && (
                  <li className="-ms-2.5">
                    <Avatar initials={`+${more}`} tone="teal" size={40} className="border-2 border-white" />
                    <span className="sr-only">{tl("moreStudents", { count: more })}</span>
                  </li>
                )}
              </ul>
            )}
            <Link href="/teacher/students" className="text-sm font-semibold text-teal-dark hover:text-navy">
              {t("viewStudents")}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
