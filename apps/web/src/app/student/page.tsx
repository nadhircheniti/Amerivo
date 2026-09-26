import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, StatTile } from "@/components/ui/primitives";
import { currentStudent, formatUsd, getTeacher, teachers } from "@/lib/mock-data";
import { HomeworkList, type HomeworkItem } from "./_components/homework-list";

export const metadata: Metadata = { title: "Overview" };

// Sample dashboard data — swapped for the API per module.
const sarah = getTeacher("sarah-mitchell") ?? teachers[0];
const nextLesson = { id: "l-1014", teacher: sarah, startsIn: "8 min", when: "Today · 18:00–18:50 (your time)", topic: "Leading a team meeting" };

const upcoming = [
  { id: "l-1015", dow: "THU", day: 15, teacher: "Sarah Mitchell", subject: "Business English", time: "18:00–18:50", topic: "Negotiation phrases" },
  { id: "l-1016", dow: "MON", day: 19, teacher: "James Robinson", subject: "Conversation", time: "19:00–19:50", topic: "Small talk at work" },
];

const homework: HomeworkItem[] = [
  { id: "hw-1", title: "Write a meeting agenda (150 words)", due: "Due tomorrow", teacher: "Sarah", urgent: true },
  { id: "hw-2", title: "Listening: podcast episode + 5 questions", due: "Due Mon", teacher: "James" },
  { id: "hw-3", title: "Phrasal verbs worksheet", due: "Due Oct 9", teacher: "Sarah", done: true },
];

const payments = [
  { label: "10-lesson pack · Sarah", amount: 315 },
  { label: "Single lesson · James", amount: 28 },
  { label: "Trial lesson · Sarah", amount: 0 },
];

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
  return (
    <div className="mx-auto flex max-w-[1176px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      {/* Greeting */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[26px] font-extrabold sm:text-[30px]">Good evening, {currentStudent.firstName}</h1>
          <p className="mt-1 text-[15px] text-muted">Keep going — you&apos;re getting closer to B2.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications (new)"
            className="relative inline-flex size-12 items-center justify-center rounded-full border border-sand bg-white text-navy hover:bg-beige"
          >
            <Icon name="bell" />
            <span className="absolute top-2.5 right-3 size-2 rounded-full bg-orange-dark" aria-hidden="true" />
          </button>
          <ButtonLink href="/teachers">Book a lesson</ButtonLink>
        </div>
      </div>

      {/* Next lesson */}
      <section className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-navy px-6 py-7 text-white sm:flex-row sm:items-center sm:gap-7 sm:px-[34px] sm:py-[30px]" aria-labelledby="next-lesson">
        <div className="pointer-events-none absolute -top-20 -right-[60px] size-[260px] rounded-full bg-teal opacity-[0.22]" aria-hidden="true" />
        <Avatar initials={nextLesson.teacher.initials} tone={nextLesson.teacher.tone} size={76} />
        <div className="relative flex flex-1 flex-col gap-1.5">
          <span className="font-display text-xs font-semibold tracking-[3px] text-yellow">NEXT LESSON · STARTS IN {nextLesson.startsIn.toUpperCase()}</span>
          <h2 id="next-lesson" className="text-[22px] font-bold text-white sm:text-[26px]">
            Business English with {nextLesson.teacher.name.split(" ")[0]}
          </h2>
          <p className="text-[15px] text-ink-soft">
            {nextLesson.when} · Topic: {nextLesson.topic}
          </p>
        </div>
        <ButtonLink href={`/classroom/${nextLesson.id}`} size="lg" className="relative shrink-0 px-7">
          <Icon name="video" strokeWidth={2} />
          Join classroom
        </ButtonLink>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Your progress">
        <StatTile label="Hours studied" value="14.2" hint="+2.5 this month" hintClassName="text-teal-dark" />
        <StatTile label="Lessons completed" value="17" hint="With 2 teachers" />
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-white p-[22px]">
          <span className="text-sm text-muted">Level progress</span>
          <div className="flex justify-between font-display text-[22px] font-extrabold">
            <span>B1</span>
            <span className="text-muted">B2</span>
          </div>
          <div className="h-2 rounded-md bg-line-soft" role="progressbar" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100} aria-label="Progress from B1 to B2">
            <div className="h-2 w-[60%] rounded-md bg-teal-dark" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-white p-[22px]">
          <span className="text-sm text-muted">Current plan</span>
          <span className="font-display text-[22px] font-extrabold">10-lesson pack</span>
          <span className="text-[13px] text-muted">3 lessons left</span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Upcoming lessons" id="upcoming" action={{ href: "/student/lessons", label: "View calendar" }}>
          <ul className="flex flex-col gap-3.5">
            {upcoming.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-beige p-3.5">
                <div className="w-14 text-center">
                  <p className="text-xs text-muted">{l.dow}</p>
                  <p className="font-display text-[22px] font-extrabold">{l.day}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {l.teacher} · {l.subject}
                  </p>
                  <p className="text-sm text-muted">
                    {l.time} · {l.topic}
                  </p>
                </div>
                <button
                  type="button"
                  className="h-10 rounded-full border border-line bg-white px-4 text-sm text-navy hover:bg-beige"
                  aria-label={`Reschedule lesson with ${l.teacher} on ${l.dow} ${l.day}`}
                >
                  Reschedule
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-dashed border-teal p-4">
            <p className="min-w-[200px] flex-1 text-sm text-navy-soft">
              <strong className="text-navy">Next teacher?</strong> Keep learning with Sarah or try someone new.
            </p>
            <Link href={`/teachers/${sarah.slug}`} className="text-sm font-semibold text-teal-dark hover:text-navy">
              Book Sarah
            </Link>
            <Link href="/teachers" className="text-sm font-semibold text-teal-dark hover:text-navy">
              Browse
            </Link>
          </div>
        </Panel>

        <HomeworkList items={homework} previouslyDone={8} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Last lesson summary" id="last-lesson" action={{ href: "/student/lessons/l-1014", label: "Open report" }}>
          <p className="text-sm text-muted">Oct 9 · Sarah Mitchell · Presenting quarterly results</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] bg-teal-50 p-4">
              <h3 className="mb-1.5 font-sans text-sm font-semibold">Strengths</h3>
              <p className="text-sm leading-normal text-navy-soft">Clear structure, good use of linking words.</p>
            </div>
            <div className="rounded-[14px] bg-cream p-4">
              <h3 className="mb-1.5 font-sans text-sm font-semibold">To work on</h3>
              <p className="text-sm leading-normal text-navy-soft">Past tense endings; slow down on numbers.</p>
            </div>
          </div>
        </Panel>

        <Panel title="Payments" id="payments" action={{ href: "/student/payments", label: "All invoices" }}>
          <ul className="flex flex-col">
            {payments.map((p) => (
              <li key={p.label} className="flex justify-between gap-3 border-b border-line-soft py-2.5 text-sm last:border-b-0">
                <span>{p.label}</span>
                <span className="font-semibold">{p.amount === 0 ? "Free" : formatUsd(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
