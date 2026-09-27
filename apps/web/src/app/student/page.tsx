import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, StatTile } from "@/components/ui/primitives";
import { currentStudent, formatUsd, getTeacher, teachers } from "@/lib/mock-data";
import { Suspense } from "react";
import { intlTags, type Locale } from "@/i18n/config";
import { HomeworkList, type HomeworkItem } from "./_components/homework-list";
import { LiveLessons } from "./_components/live-lessons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.overview");
  return { title: t("metaTitle") };
}

// Sample dashboard data — swapped for the API per module.
const sarah = getTeacher("sarah-mitchell") ?? teachers[0];
const nextLesson = {
  id: "l-1014",
  teacher: sarah,
  startsInMin: 8,
  subject: "Business English",
  time: "18:00–18:50",
  topic: "Leading a team meeting",
};

const upcoming = [
  {
    id: "l-1015",
    date: "2026-10-15",
    teacher: "Sarah Mitchell",
    subject: "Business English",
    time: "18:00–18:50",
    topic: "Negotiation phrases",
  },
  {
    id: "l-1016",
    date: "2026-10-19",
    teacher: "James Robinson",
    subject: "Conversation",
    time: "19:00–19:50",
    topic: "Small talk at work",
  },
];

const homework: HomeworkItem[] = [
  {
    id: "hw-1",
    title: "Write a meeting agenda (150 words)",
    due: "tomorrow",
    teacher: "Sarah",
    urgent: true,
  },
  {
    id: "hw-2",
    title: "Listening: podcast episode + 5 questions",
    due: { date: "2026-10-19", style: "weekday" },
    teacher: "James",
  },
  {
    id: "hw-3",
    title: "Phrasal verbs worksheet",
    due: { date: "2026-10-09", style: "date" },
    teacher: "Sarah",
    done: true,
  },
];

const payments = [
  { id: "p-3", kind: "pack", count: 10, teacher: "Sarah", amount: 315 },
  { id: "p-2", kind: "single", teacher: "James", amount: 28 },
  { id: "p-1", kind: "trial", teacher: "Sarah", amount: 0 },
] as const;

const lastLesson = { date: "2026-10-09", teacher: "Sarah Mitchell", topic: "Presenting quarterly results" };

/** Sample dates are calendar days: format them in UTC so they never shift. */
const formatDay = (iso: string, locale: Locale, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlTags[locale], { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

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

export default function StudentDashboardPage() {
  const t = useTranslations("student.overview");
  const ts = useTranslations("common.specialties");
  const locale = useLocale() as Locale;
  const specialty = (s: string) => (ts.has(s as never) ? ts(s as never) : s);
  const num = (n: number) => n.toLocaleString(intlTags[locale]);

  return (
    <div className="mx-auto flex max-w-[1176px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      {/* Greeting */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-extrabold sm:text-[30px]">{t("greeting", { name: currentStudent.firstName })}</h1>
          <p className="mt-1 text-[15px] text-muted">{t("encouragement", { level: "B2" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("notifications")}
            className="relative inline-flex size-12 items-center justify-center rounded-full border border-sand bg-white text-navy hover:bg-beige"
          >
            <Icon name="bell" />
            <span className="absolute top-2.5 end-3 size-2 rounded-full bg-orange-dark" aria-hidden="true" />
          </button>
          <ButtonLink href="/teachers">{t("bookLesson")}</ButtonLink>
        </div>
      </div>

      <Suspense>
        <LiveLessons />
      </Suspense>

      {/* Next lesson */}
      <section
        className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-navy px-6 py-7 text-white sm:flex-row sm:items-center sm:gap-7 sm:px-[34px] sm:py-[30px]"
        aria-labelledby="next-lesson"
      >
        <div className="pointer-events-none absolute -top-20 -end-[60px] size-[260px] rounded-full bg-teal opacity-[0.22]" aria-hidden="true" />
        <Avatar initials={nextLesson.teacher.initials} tone={nextLesson.teacher.tone} size={76} />
        <div className="relative flex flex-1 flex-col gap-1.5">
          <span className="font-display text-xs font-semibold tracking-[3px] text-yellow uppercase">{t("nextLesson.eyebrow", { minutes: nextLesson.startsInMin })}</span>
          <h2 id="next-lesson" className="text-[22px] font-bold text-white sm:text-[26px]">
            {t("nextLesson.title", { subject: specialty(nextLesson.subject), name: nextLesson.teacher.name.split(" ")[0] })}
          </h2>
          <p className="text-[15px] text-ink-soft">{t("nextLesson.details", { time: `\u2066${nextLesson.time}\u2069`, topic: nextLesson.topic })}</p>
        </div>
        <ButtonLink href={`/classroom/${nextLesson.id}`} size="lg" className="relative shrink-0 px-7">
          <Icon name="video" strokeWidth={2} />
          {t("nextLesson.join")}
        </ButtonLink>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("stats.label")}>
        <StatTile label={t("stats.hoursStudied")} value={num(14.2)} hint={t("stats.hoursHint", { hours: num(2.5) })} hintClassName="text-teal-dark" />
        <StatTile label={t("stats.lessonsCompleted")} value={num(17)} hint={t("stats.withTeachers", { count: 2 })} />
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-white p-[22px]">
          <span className="text-sm text-muted">{t("stats.levelProgress")}</span>
          <div className="flex justify-between font-display text-[22px] font-extrabold">
            <span>B1</span>
            <span className="text-muted">B2</span>
          </div>
          <div
            className="h-2 rounded-md bg-line-soft"
            role="progressbar"
            aria-valuenow={60}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("stats.levelProgressAria", { from: "B1", to: "B2" })}
          >
            <div className="h-2 w-[60%] rounded-md bg-teal-dark" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-white p-[22px]">
          <span className="text-sm text-muted">{t("stats.currentPlan")}</span>
          <span className="font-display text-[22px] font-extrabold">{t("stats.pack", { count: 10 })}</span>
          <span className="text-[13px] text-muted">{t("stats.lessonsLeft", { count: 3 })}</span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={t("upcoming.title")} id="upcoming" action={{ href: "/student/lessons", label: t("upcoming.viewCalendar") }}>
          <ul className="flex flex-col gap-3.5">
            {upcoming.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-beige p-3.5">
                <div className="w-14 text-center">
                  <p className="text-xs text-muted uppercase">{formatDay(l.date, locale, { weekday: "short" })}</p>
                  <p className="font-display text-[22px] font-extrabold">{Number(l.date.slice(8))}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {l.teacher} · {specialty(l.subject)}
                  </p>
                  <p className="text-sm text-muted">
                    <bdi dir="ltr">{l.time}</bdi> · {l.topic}
                  </p>
                </div>
                <button
                  type="button"
                  className="h-10 rounded-full border border-line bg-white px-4 text-sm text-navy hover:bg-beige"
                  aria-label={t("upcoming.rescheduleAria", { name: l.teacher, date: formatDay(l.date, locale, { weekday: "long", month: "long", day: "numeric" }) })}
                >
                  {t("upcoming.reschedule")}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-dashed border-teal p-4">
            <p className="min-w-[200px] flex-1 text-sm text-navy-soft">
              {t.rich("upcoming.nextTeacher", { name: "Sarah", strong: (c) => <strong className="text-navy">{c}</strong> })}
            </p>
            <Link href={`/teachers/${sarah.slug}`} className="text-sm font-semibold text-teal-dark hover:text-navy">
              {t("upcoming.bookName", { name: "Sarah" })}
            </Link>
            <Link href="/teachers" className="text-sm font-semibold text-teal-dark hover:text-navy">
              {t("upcoming.browse")}
            </Link>
          </div>
        </Panel>

        <HomeworkList items={homework} previouslyDone={8} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={t("lastLesson.title")} id="last-lesson" action={{ href: "/student/lessons/l-1014", label: t("lastLesson.openReport") }}>
          <p className="text-sm text-muted">
            {formatDay(lastLesson.date, locale, { month: "short", day: "numeric" })} · {lastLesson.teacher} · {lastLesson.topic}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] bg-teal-50 p-4">
              <h3 className="mb-1.5 font-sans text-sm font-semibold">{t("lastLesson.strengths")}</h3>
              <p className="text-sm leading-normal text-navy-soft">Clear structure, good use of linking words.</p>
            </div>
            <div className="rounded-[14px] bg-cream p-4">
              <h3 className="mb-1.5 font-sans text-sm font-semibold">{t("lastLesson.toWorkOn")}</h3>
              <p className="text-sm leading-normal text-navy-soft">Past tense endings; slow down on numbers.</p>
            </div>
          </div>
        </Panel>

        <Panel title={t("payments.title")} id="payments" action={{ href: "/student/payments", label: t("payments.allInvoices") }}>
          <ul className="flex flex-col">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 border-b border-line-soft py-2.5 text-sm last:border-b-0">
                <span>{p.kind === "pack" ? t("payments.pack", { count: p.count, teacher: p.teacher }) : t(`payments.${p.kind}`, { teacher: p.teacher })}</span>
                <span className="font-semibold">{p.amount === 0 ? t("payments.free") : formatUsd(p.amount, locale)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
