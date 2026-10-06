"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { StatTile } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { Loadable, PageHeader } from "../_components/states";
import { demoProgress } from "../_lib/demo";
import { fullName, useFormat } from "../_lib/format";
import type { Cefr, Progress } from "../_lib/types";
import { useStudentData } from "../_lib/use-student-data";

const CEFR: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["grammar", "reading", "listening", "speaking"] as const;

export function ProgressView() {
  const t = useTranslations("student.progress");
  const state = useStudentData<Progress>("/student/progress", () => demoProgress());
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader title={t("title")} description={t("description")} />
      <Loadable state={state}>{(p) => <ProgressBody p={p} />}</Loadable>
    </div>
  );
}

function ProgressBody({ p }: { p: Progress }) {
  const t = useTranslations("student.progress");
  const f = useFormat();
  const placement = p.levelHistory[0];
  const maxLessons = Math.max(1, ...p.lessonsPerMonth.map((m) => m.lessons));

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("statsLabel")}>
        <StatTile label={t("totalHours")} value={f.num(p.totalHours, 1)} hint={t("thisMonth", { hours: f.num(p.hoursThisMonth, 1) })} />
        <StatTile label={t("lessonsCompleted")} value={f.num(p.lessonsCompleted)} />
        <StatTile label={t("teachers")} value={f.num(p.teachersCount)} />
        <StatTile
          label={t("currentLevel")}
          value={p.level.current ?? "—"}
          hint={p.level.target && p.level.target !== p.level.current ? t("nextGoal", { level: p.level.target }) : undefined}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Level */}
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby="level-title">
          <h2 id="level-title" className="text-[19px] font-bold">
            {t("levelTitle")}
          </h2>
          {p.level.current ? (
            <>
              <ol className="grid grid-cols-6 gap-1.5" aria-label={t("scaleAria", { level: p.level.current })}>
                {CEFR.map((l) => {
                  const reached = CEFR.indexOf(l) <= CEFR.indexOf(p.level.current!);
                  const isCurrent = l === p.level.current;
                  const isTarget = l === p.level.target && !isCurrent;
                  return (
                    <li key={l} className="flex flex-col items-center gap-1.5" aria-current={isCurrent ? "step" : undefined}>
                      <span className={cn("h-2.5 w-full rounded-md", reached ? "bg-teal-dark" : isTarget ? "bg-orange" : "bg-line-soft")} aria-hidden="true" />
                      <span className={cn("text-[13px]", isCurrent ? "font-bold text-navy" : "text-muted")}>{l}</span>
                    </li>
                  );
                })}
              </ol>
              {placement && Object.keys(placement.scores).length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <h3 className="font-sans text-sm font-semibold">{t("skillsTitle")}</h3>
                  <ul className="flex flex-col gap-2">
                    {SKILLS.filter((s) => placement.scores[s]).map((s) => {
                      const lvl = placement.scores[s]!;
                      return (
                        <li key={s} className="grid grid-cols-[88px_1fr_32px] items-center gap-3 text-sm">
                          <span className="text-navy-soft">{t(`skills.${s}`)}</span>
                          <span className="h-2.5 rounded-md bg-line-soft" aria-hidden="true">
                            <span className="block h-2.5 rounded-md bg-sky" style={{ width: `${((CEFR.indexOf(lvl) + 1) / CEFR.length) * 100}%` }} />
                          </span>
                          <span className="text-end font-semibold">{lvl}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {p.level.placement === "completed" && (
                  <Link href="/onboarding/results" className="font-semibold text-teal-dark hover:text-navy">
                    {t("seeCorrections")}
                  </Link>
                )}
                <Link href="/onboarding/test" className="font-semibold text-teal-dark hover:text-navy">
                  {p.level.placement === "skipped" ? t("takeTest") : t("retakeTest")}
                </Link>
              </div>
              <ul className="flex flex-col gap-1.5 border-t border-line-soft pt-3 text-sm">
                {p.levelHistory.map((h, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-navy-soft">
                      {f.date(h.date)} · {t(`source.${h.source}`)}
                    </span>
                    <span className="font-semibold">{h.level}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-navy-soft">{t("noLevel")}</p>
              <ButtonLink href="/onboarding/test" size="sm" variant="teal">
                {t("takeTest")}
              </ButtonLink>
            </div>
          )}
        </section>

        {/* Lessons per month */}
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 sm:p-[26px]" aria-labelledby="months-title">
          <h2 id="months-title" className="text-[19px] font-bold">
            {t("perMonthTitle")}
          </h2>
          <figure className="flex flex-col gap-2">
            <ol className="flex h-48 items-end gap-3" aria-describedby="months-caption">
              {p.lessonsPerMonth.map((m) => (
                <li key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-sm font-semibold">
                    <span className="sr-only">{f.month(m.month, { month: "long", year: "numeric" })}: </span>
                    {t("lessonsCount", { count: m.lessons })}
                  </span>
                  <span
                    className={cn("w-full max-w-12 rounded-t-lg", m.lessons ? "bg-teal-dark" : "bg-line-soft")}
                    style={{ height: `${Math.max(4, (m.lessons / maxLessons) * 100)}%` }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-muted" aria-hidden="true">
                    {f.month(m.month)}
                  </span>
                </li>
              ))}
            </ol>
            <figcaption id="months-caption" className="text-xs text-muted">
              {t("perMonthCaption")}
            </figcaption>
          </figure>
        </section>
      </div>

      {/* Reports */}
      <section className="flex flex-col gap-3.5" aria-labelledby="reports-title">
        <h2 id="reports-title" className="text-[19px] font-bold">
          {t("reportsTitle")}
        </h2>
        {p.reports.length === 0 ? (
          <p className="rounded-3xl bg-white p-6 text-sm text-navy-soft">{t("noReports")}</p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {p.reports.map((r) => (
              <li key={r.bookingId} className="flex flex-col gap-3 rounded-3xl bg-white p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{r.topicsCovered}</p>
                  <Link href={`/student/lessons/${r.bookingId}`} className="text-sm font-semibold text-teal-dark hover:text-navy">
                    {t("openReport")}
                  </Link>
                </div>
                <p className="text-sm text-muted">
                  {f.date(r.date)} · {fullName(r.teacher)}
                </p>
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-[14px] bg-teal-50 p-3.5">
                    <dt className="mb-1 font-semibold">{t("strengths")}</dt>
                    <dd className="whitespace-pre-line text-navy-soft">{r.strengths || "—"}</dd>
                  </div>
                  <div className="rounded-[14px] bg-cream p-3.5">
                    <dt className="mb-1 font-semibold">{t("toWorkOn")}</dt>
                    <dd className="whitespace-pre-line text-navy-soft">{r.developmentAreas || "—"}</dd>
                  </div>
                  <div className="rounded-[14px] bg-beige p-3.5">
                    <dt className="mb-1 font-semibold">{t("recommendation")}</dt>
                    <dd className="whitespace-pre-line text-navy-soft">{r.recommendation || "—"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
