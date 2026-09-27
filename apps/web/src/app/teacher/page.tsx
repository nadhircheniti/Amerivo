import type { Metadata } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, StatTile, type AvatarTone } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { currentTeacher, formatUsd } from "@/lib/mock-data";
import { Suspense } from "react";
import { LiveLessons } from "@/app/student/_components/live-lessons";
import { VacationToggle } from "./_components/vacation-toggle";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.dashboard");
  return { title: t("metaTitle") };
}

/** Sample "today" of the demo data (yyyy-mm-dd). */
const TODAY = "2026-10-14";

const reports = [
  { student: "Lucas Moreau", date: "2026-10-13", lessonId: "l-1014" },
  { student: "Ana Costa", date: "2026-10-12", lessonId: "l-1014" },
];

const studentStack: { initials: string; tone: AvatarTone; name: string }[] = [
  { initials: "MS", tone: "yellow", name: "Maria Silva" },
  { initials: "LM", tone: "sky", name: "Lucas Moreau" },
  { initials: "AC", tone: "lilac", name: "Ana Costa" },
];

const firstName = currentTeacher.name.split(" ")[0];

const sr = (c: React.ReactNode) => <span className="sr-only">{c}</span>;

export default function TeacherDashboardPage() {
  const t = useTranslations("teacher.dashboard");
  const ts = useTranslations("common.specialties");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const date = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { timeZone: "UTC", ...opts }).format(new Date(`${iso}T12:00:00Z`));
  const num = (n: number) => n.toLocaleString(tag);
  const shortDate = (iso: string) => date(iso, { month: "short", day: "numeric" });

  const notifications = [
    { id: "booking", dot: "bg-teal-dark", title: t("notifNewBooking"), text: t("notifNewBookingText", { name: "Kenji T.", time: "14:00" }) },
    {
      id: "cancel",
      dot: "bg-orange",
      title: t("notifCancellation"),
      text: t("notifCancellationText", { name: "Ana C.", day: date("2026-10-16", { weekday: "short" }), time: "10:00" }),
    },
    { id: "payout", dot: "bg-sky", title: t("notifPayout"), text: t("notifPayoutText", { month: date("2026-09-15", { month: "long" }) }) },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("greeting", { name: firstName, count: 3 })}</h1>
          <p className="mt-1 text-[15px] text-muted">{t("dateLine", { date: date(TODAY, { weekday: "long", month: "long", day: "numeric" }) })}</p>
        </div>
        <VacationToggle />
      </header>

      {/* Real bookings (API) with the classroom link; the tiles below are still sample data. */}
      <Suspense>
        <LiveLessons forTeacher />
      </Suspense>

      <section aria-label={t("keyFigures")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={t("todaysLessons")} value={num(3)} hint={t("nextAt", { time: "11:00" })} />
        <StatTile
          label={t("pendingEarnings", { month: date(TODAY, { month: "short" }) })}
          value={formatUsd(1092, locale).replace(/[.,]00(?!\d)/, "")}
          hint={t("paidBy", { date: shortDate("2026-10-28") })}
          hintClassName="text-teal-dark"
        />
        <StatTile label={t("activeStudents")} value={num(14)} hint={t("newThisWeek", { count: 2 })} />
        <StatTile label={t("averageRating")} value={num(4.9)} hint={t("cancellations", { count: 0, total: 3 })} />
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

          <ol className="flex flex-col gap-3.5">
            {/* Current lesson */}
            <li className="flex flex-col gap-4 rounded-[18px] border-2 border-teal bg-teal-50 p-[18px] sm:flex-row">
              <div className="w-[70px] shrink-0">
                <p className="font-display text-xl font-extrabold">11:00</p>
                <p className="text-[13px] text-muted">{t("minutes", { count: 50 })}</p>
              </div>
              <div className="flex grow flex-col gap-1.5">
                <p className="text-base font-bold">Maria Silva · {ts("Business English")} · B1</p>
                <p className="flex items-start gap-2 rounded-[10px] bg-white px-2.5 py-2 text-[13px]">
                  <Icon name="repeat" size={16} strokeWidth={2} className="mt-px shrink-0 text-orange-dark" />
                  <span>
                    {t.rich("returningStudentLine", {
                      strong: (c) => <strong>{c}</strong>,
                      lessons: 11,
                      hours: num(9.2),
                      date: shortDate("2026-10-09"),
                    })}
                  </span>
                </p>
                <p className="text-[13px] text-navy-soft">{t("lastNote", { note: "Work on past tense; next: negotiation phrases." })}</p>
              </div>
              <ButtonLink href="/classroom/l-1014" variant="teal" size="sm" className="shrink-0 self-start font-bold sm:self-center">
                {t("startLesson")}
              </ButtonLink>
            </li>

            <li className="flex flex-col gap-4 rounded-[18px] bg-beige p-[18px] sm:flex-row">
              <div className="w-[70px] shrink-0">
                <p className="font-display text-xl font-extrabold">14:00</p>
                <p className="text-[13px] text-muted">{t("minutes", { count: 20 })}</p>
              </div>
              <div className="flex grow flex-col gap-1.5">
                <p className="text-base font-bold">Kenji Tanaka · {t("trialLesson")}</p>
                <p className="text-[13px] text-navy-soft">
                  <span className="me-1 rounded-md bg-sky-100 px-2 py-[3px] font-semibold">{t("newStudent")}</span>{" "}
                  {t("goalLine", { goal: ts("Interview Prep"), level: "A2", city: "Tokyo" })}
                </p>
              </div>
              <Link href="/teacher/messages" className="self-start text-sm font-semibold text-teal-dark hover:text-navy sm:self-center">
                {t.rich("message", { sr, name: "Kenji Tanaka" })}
              </Link>
            </li>

            <li className="flex flex-col gap-4 rounded-[18px] bg-beige p-[18px] sm:flex-row">
              <div className="w-[70px] shrink-0">
                <p className="font-display text-xl font-extrabold">17:30</p>
                <p className="text-[13px] text-muted">{t("minutes", { count: 50 })}</p>
              </div>
              <div className="flex grow flex-col gap-1.5">
                <p className="text-base font-bold">Lucas Moreau · {ts("Conversation")} · B2</p>
                <p className="text-[13px] text-navy-soft">
                  <span className="me-1 rounded-md bg-orange-100 px-2 py-[3px] font-semibold">{t("returning")}</span> {t("returningShort", { lessons: 4, hours: num(3.3) })}
                </p>
              </div>
              <Link href="/teacher/messages" className="self-start text-sm font-semibold text-teal-dark hover:text-navy sm:self-center">
                {t.rich("message", { sr, name: "Lucas Moreau" })}
              </Link>
            </li>
          </ol>
        </section>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="reports-heading" className="flex flex-col gap-3 rounded-3xl bg-cream p-6">
            <h2 id="reports-heading" className="text-[17px] font-bold">
              {t("reportsTitle")}
            </h2>
            <ul className="flex flex-col gap-3">
              {reports.map((r) => (
                <li key={r.student} className="flex items-center justify-between text-sm">
                  <span>
                    {r.student} · {shortDate(r.date)}
                  </span>
                  <Link href={`/teacher/lessons/${r.lessonId}/report`} className="font-semibold text-teal-dark hover:text-navy">
                    {t.rich("writeReport", { sr, name: r.student })}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="notif-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
            <h2 id="notif-heading" className="text-[17px] font-bold">
              {t("notificationsTitle")}
            </h2>
            <ul className="flex flex-col gap-3">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 text-sm leading-normal">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.dot}`} aria-hidden="true" />
                  <span>
                    <strong>{n.title}</strong> · {n.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="students-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 id="students-heading" className="text-[17px] font-bold">
                {t("myStudents")}
              </h2>
              <span className="text-[13px] text-muted">{t("studentsCount", { active: num(14), past: num(31) })}</span>
            </div>
            <div
              className="flex"
              role="img"
              aria-label={t("studentsAvatars", { first: studentStack[0].name, second: studentStack[1].name, third: studentStack[2].name, count: 11 })}
            >
              {studentStack.map((s, i) => (
                <Avatar key={s.initials} initials={s.initials} tone={s.tone} size={40} className={i > 0 ? "-ms-2.5 border-2 border-white" : "border-2 border-white"} />
              ))}
              <Avatar initials="+11" tone="teal" size={40} className="-ms-2.5 border-2 border-white" />
            </div>
            <Link href="/teacher/students" className="text-sm font-semibold text-teal-dark hover:text-navy">
              {t("viewStudents")}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
