import type { Metadata } from "next";
import Link from "next/link";
import { FocusHeader } from "@/components/layout/focus-header";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, CheckItem, Eyebrow } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { cefrLevels, currentStudent, formatUsd, getTeacher, type Teacher } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Your level and matches" };

// Sample placement result — replaced by the level-test API.
const result = { level: "B1" as const, label: "Intermediate" };
const skills = [
  { name: "Grammar", level: "B1", pct: 55 },
  { name: "Reading", level: "B2", pct: 70 },
  { name: "Listening", level: "B1", pct: 50 },
  { name: "Speaking", level: "A2", pct: 35, weak: true },
];

const matches: { slug: string; reasons: string[] }[] = [
  { slug: "sarah-mitchell", reasons: ["Business English specialist", "Available on your evenings", "Speaks Spanish"] },
  { slug: "michael-brooks", reasons: ["Negotiation & presentations", "10 years of experience", "Weekend slots"] },
  { slug: "james-robinson", reasons: ["Focus on speaking fluency", "Budget friendly", "Available on your evenings"] },
];

export default function ResultsPage() {
  const reached = cefrLevels.indexOf(result.level);
  const recommended = matches
    .map((m) => ({ ...m, teacher: getTeacher(m.slug) }))
    .filter((m): m is { slug: string; reasons: string[]; teacher: Teacher } => Boolean(m.teacher));

  return (
    <>
      <FocusHeader center="Step 4 of 4 · Complete" right={{ href: "/student", label: "Go to my dashboard" }} progress={100} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-20 lg:py-11">
        {/* Level result */}
        <section className="flex flex-col items-center gap-10 rounded-[28px] bg-white p-6 sm:p-10 lg:flex-row lg:gap-12">
          <div
            className="flex size-[200px] shrink-0 flex-col items-center justify-center gap-1 rounded-full bg-navy text-white shadow-[0_0_0_12px_var(--color-teal-100)]"
            aria-label={`Your level: ${result.level}, ${result.label}`}
            role="img"
          >
            <span className="font-display text-[64px] leading-none font-extrabold">{result.level}</span>
            <span className="text-[15px] font-semibold text-yellow">{result.label}</span>
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-[18px]">
            <Eyebrow>Your placement result</Eyebrow>
            <h1 className="text-[28px] font-extrabold sm:text-4xl">
              Great work, {currentStudent.firstName}! You&apos;re at {result.level}.
            </h1>
            <p className="max-w-[640px] text-base leading-relaxed text-navy-soft">
              You can handle most everyday situations. Next goal: speak more fluently in meetings and understand native speakers at natural speed (B2).
            </p>
            <ol className="grid max-w-[640px] grid-cols-6 gap-1.5" aria-label="CEFR scale">
              {cefrLevels.map((l, i) => (
                <li key={l} className="flex flex-col gap-1.5" aria-current={l === result.level ? "step" : undefined}>
                  <span className={cn("h-2.5 rounded-md", i <= reached ? "bg-teal-dark" : "bg-sand")} />
                  <span className={cn("text-[13px]", l === result.level ? "font-bold text-navy" : "text-muted")}>{l}</span>
                </li>
              ))}
            </ol>
          </div>

          <ul className="flex w-full shrink-0 flex-col gap-3.5 border-line-soft max-lg:border-t max-lg:pt-8 lg:w-[300px] lg:border-l lg:pl-10" aria-label="Level by skill">
            {skills.map((s) => (
              <li key={s.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <strong>{s.level}</strong>
                </div>
                <div className="h-2 rounded-md bg-line-soft">
                  <div className={cn("h-2 rounded-md", s.weak ? "bg-orange" : "bg-sky")} style={{ width: `${s.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Recommendations */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-extrabold sm:text-[28px]">Teachers recommended for you</h2>
            <p className="text-base text-navy-soft">Matched on your goal (Business), your level, evening availability and rating.</p>
          </div>
          <Link href="/teachers" className="shrink-0 font-semibold text-teal-dark hover:text-navy">
            See all teachers
          </Link>
        </div>

        <div className="grid gap-6 pt-3 md:grid-cols-2 xl:grid-cols-3">
          {recommended.map(({ teacher: t, reasons }, i) => (
            <article key={t.slug} className={cn("relative flex flex-col gap-4 rounded-3xl bg-white p-7", i === 0 && "border-2 border-teal")}>
              {i === 0 && (
                <span className="absolute -top-3.5 left-6 rounded-full bg-teal-dark px-3 py-1.5 text-xs font-bold tracking-[1px] text-white">BEST MATCH</span>
              )}
              <div className="flex items-center gap-4">
                <Avatar initials={t.initials} tone={t.tone} size={72} />
                <div className="flex flex-col gap-1">
                  <h3 className="text-[19px] font-bold">{t.name}</h3>
                  <span className="inline-flex items-center gap-1 text-sm text-muted">
                    {t.rating.toFixed(1)} <Icon name="star" size={14} className="text-orange" />
                    <span className="sr-only">out of 5</span> · {formatUsd(t.priceUsd).replace(".00", "")} / lesson
                  </span>
                </div>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {reasons.map((r) => (
                  <CheckItem key={r}>{r}</CheckItem>
                ))}
              </ul>
              <div className="mt-auto flex gap-2.5">
                <ButtonLink
                  href={t.offersTrial ? `/teachers/${t.slug}?type=trial` : `/teachers/${t.slug}`}
                  className="flex-1 px-3"
                  aria-label={t.offersTrial ? `Book free trial with ${t.name}` : `Book a lesson with ${t.name}`}
                >
                  {t.offersTrial ? "Book free trial" : "Book a lesson"}
                </ButtonLink>
                <ButtonLink href={`/teachers/${t.slug}`} variant="outline" className="flex-1 px-3" aria-label={`${t.name}'s profile`}>
                  Profile
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
