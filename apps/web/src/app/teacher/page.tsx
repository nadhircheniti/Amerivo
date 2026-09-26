import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, StatTile, type AvatarTone } from "@/components/ui/primitives";
import { currentTeacher } from "@/lib/mock-data";
import { ModeToggle } from "./_components/mode-toggle";

export const metadata: Metadata = { title: "Teacher dashboard · Amerivo English" };

const reports = [
  { student: "Lucas Moreau", date: "Oct 13", lessonId: "l-1014" },
  { student: "Ana Costa", date: "Oct 12", lessonId: "l-1014" },
];

const notifications = [
  { dot: "bg-teal-dark", title: "New booking", text: "Kenji T. booked a trial for today 14:00" },
  { dot: "bg-orange", title: "Cancellation", text: "Ana C. cancelled Fri 10:00 (> 24 h, refunded)" },
  { dot: "bg-sky", title: "Payout issued", text: "September payout sent to your bank" },
];

const studentStack: { initials: string; tone: AvatarTone; name: string }[] = [
  { initials: "MS", tone: "yellow", name: "Maria Silva" },
  { initials: "LM", tone: "sky", name: "Lucas Moreau" },
  { initials: "AC", tone: "lilac", name: "Ana Costa" },
];

const firstName = currentTeacher.name.split(" ")[0];

export default function TeacherDashboardPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[30px]">Hi {firstName}, you have 3 lessons today</h1>
          <p className="mt-1 text-[15px] text-muted">Wednesday, October 14 · Central Time (Austin)</p>
        </div>
        <ModeToggle label="Vacation mode" onNote="Hidden from new bookings" />
      </header>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Today's lessons" value="3" hint="Next at 11:00" />
        <StatTile label="Pending earnings (Oct)" value="$1,092" hint="Paid by Oct 28" hintClassName="text-teal-dark" />
        <StatTile label="Active students" value="14" hint="2 new this week" />
        <StatTile label="Average rating" value="4.9" hint="Cancellations: 0 of 3" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="today-heading" className="flex flex-col gap-3.5 rounded-3xl bg-white p-5 sm:p-[26px]">
          <div className="flex items-center justify-between">
            <h2 id="today-heading" className="text-[19px] font-bold">
              Today
            </h2>
            <Link href="/teacher/availability" className="text-sm font-semibold text-teal-dark hover:text-navy">
              Full schedule
            </Link>
          </div>

          <ol className="flex flex-col gap-3.5">
            {/* Current lesson */}
            <li className="flex flex-col gap-4 rounded-[18px] border-2 border-teal bg-teal-50 p-[18px] sm:flex-row">
              <div className="w-[70px] shrink-0">
                <p className="font-display text-xl font-extrabold">11:00</p>
                <p className="text-[13px] text-muted">50 min</p>
              </div>
              <div className="flex grow flex-col gap-1.5">
                <p className="text-base font-bold">Maria Silva · Business English · B1</p>
                <p className="flex items-start gap-2 rounded-[10px] bg-white px-2.5 py-2 text-[13px]">
                  <Icon name="repeat" size={16} strokeWidth={2} className="mt-px shrink-0 text-orange-dark" />
                  <span>
                    <strong>Returning student</strong> · 11 lessons · 9.2 h with you · last on Oct 9
                  </span>
                </p>
                <p className="text-[13px] text-navy-soft">Your last note: &ldquo;Work on past tense; next: negotiation phrases.&rdquo;</p>
              </div>
              <ButtonLink href="/classroom/l-1014" variant="teal" size="sm" className="shrink-0 self-start font-bold sm:self-center">
                Start lesson
              </ButtonLink>
            </li>

            <li className="flex flex-col gap-4 rounded-[18px] bg-beige p-[18px] sm:flex-row">
              <div className="w-[70px] shrink-0">
                <p className="font-display text-xl font-extrabold">14:00</p>
                <p className="text-[13px] text-muted">20 min</p>
              </div>
              <div className="flex grow flex-col gap-1.5">
                <p className="text-base font-bold">Kenji Tanaka · Trial lesson</p>
                <p className="text-[13px] text-navy-soft">
                  <span className="mr-1 rounded-md bg-sky-100 px-2 py-[3px] font-semibold">New student</span> Goal: Interview prep · Level A2 · Tokyo
                </p>
              </div>
              <Link href="/teacher/messages" className="self-start text-sm font-semibold text-teal-dark hover:text-navy sm:self-center">
                Message<span className="sr-only"> Kenji Tanaka</span>
              </Link>
            </li>

            <li className="flex flex-col gap-4 rounded-[18px] bg-beige p-[18px] sm:flex-row">
              <div className="w-[70px] shrink-0">
                <p className="font-display text-xl font-extrabold">17:30</p>
                <p className="text-[13px] text-muted">50 min</p>
              </div>
              <div className="flex grow flex-col gap-1.5">
                <p className="text-base font-bold">Lucas Moreau · Conversation · B2</p>
                <p className="text-[13px] text-navy-soft">
                  <span className="mr-1 rounded-md bg-orange-100 px-2 py-[3px] font-semibold">Returning</span> 4 lessons · 3.3 h with you
                </p>
              </div>
              <Link href="/teacher/messages" className="self-start text-sm font-semibold text-teal-dark hover:text-navy sm:self-center">
                Message<span className="sr-only"> Lucas Moreau</span>
              </Link>
            </li>
          </ol>
        </section>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="reports-heading" className="flex flex-col gap-3 rounded-3xl bg-cream p-6">
            <h2 id="reports-heading" className="text-[17px] font-bold">
              Reports to complete
            </h2>
            <ul className="flex flex-col gap-3">
              {reports.map((r) => (
                <li key={r.student} className="flex items-center justify-between text-sm">
                  <span>
                    {r.student} · {r.date}
                  </span>
                  <Link href={`/teacher/lessons/${r.lessonId}/report`} className="font-semibold text-teal-dark hover:text-navy">
                    Write report<span className="sr-only"> for {r.student}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="notif-heading" className="flex flex-col gap-3 rounded-3xl bg-white p-6">
            <h2 id="notif-heading" className="text-[17px] font-bold">
              Notifications
            </h2>
            <ul className="flex flex-col gap-3">
              {notifications.map((n) => (
                <li key={n.title} className="flex items-start gap-3 text-sm leading-normal">
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
                My students
              </h2>
              <span className="text-[13px] text-muted">14 active · 31 past</span>
            </div>
            <div className="flex" role="img" aria-label="Maria Silva, Lucas Moreau, Ana Costa and 11 more students">
              {studentStack.map((s, i) => (
                <Avatar key={s.initials} initials={s.initials} tone={s.tone} size={40} className={i > 0 ? "-ml-2.5 border-2 border-white" : "border-2 border-white"} />
              ))}
              <Avatar initials="+11" tone="teal" size={40} className="-ml-2.5 border-2 border-white" />
            </div>
            <Link href="/teacher/students" className="text-sm font-semibold text-teal-dark hover:text-navy">
              View students &amp; notes
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
