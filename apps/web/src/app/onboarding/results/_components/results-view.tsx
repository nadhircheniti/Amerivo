"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FocusHeader } from "@/components/layout/focus-header";
import { useMe } from "@/components/layout/role-gate";
import { ButtonLink } from "@/components/ui/button";
import { fileSrc } from "@/components/ui/file-upload";
import { Icon } from "@/components/ui/icon";
import { Avatar, Card, CheckItem, Eyebrow } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import { CEFR, SECTIONS, type PlacementStatus, type ReasonCode, type Recommendation, type Review, type ReviewSection } from "../../_lib/types";
import { sampleRecommendations, sampleReview, sampleStatus } from "./samples";

type Data = { status: PlacementStatus; recs: Recommendation[]; review: Review | null };

export function ResultsView() {
  const t = useTranslations("onboarding.results");
  const { call, isLoaded, isSignedIn } = useApi();
  const [data, setData] = useState<Data | null>(API_URL ? null : { status: sampleStatus, recs: sampleRecommendations, review: sampleReview });
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!API_URL || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await call<PlacementStatus>("/student/placement");
        const [recs, review] = await Promise.all([
          call<Recommendation[]>("/student/recommendations").catch(() => []),
          status.status === "completed" ? call<Review>("/student/placement/review").catch(() => null) : Promise.resolve(null),
        ]);
        if (!cancelled) setData({ status, recs, review });
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn, nonce]);

  return (
    <>
      <FocusHeader center={t("step")} right={{ href: "/student", label: t("dashboard") }} progress={100} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-20 lg:py-11">
        {!data && !error && (
          <Card className="p-10 text-center text-[15px] text-muted" role="status">
            {t("loading")}
          </Card>
        )}
        {error && !data && (
          <Card className="flex flex-col items-start gap-4 p-8" role="alert">
            <p className="text-[15px] font-semibold text-danger-text">{t("loadError")}</p>
            <button
              type="button"
              className="font-semibold text-teal-dark hover:text-navy"
              onClick={() => {
                setError(false);
                setNonce((n) => n + 1);
              }}
            >
              {t("retry")}
            </button>
          </Card>
        )}
        {data && (
          <>
            <LevelCard status={data.status} />
            <Recommendations recs={data.recs} goal={data.status.goal} />
            {data.review && <Corrections review={data.review} />}
          </>
        )}
      </main>
    </>
  );
}

function LevelCard({ status }: { status: PlacementStatus }) {
  const t = useTranslations("onboarding.results");
  const tsk = useTranslations("onboarding.skills");
  const me = useMe();
  const name = me?.firstName ?? "";

  if (status.status === "not_started" || !status.level) {
    return (
      <Card className="flex flex-col items-start gap-4 p-8 sm:p-10">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="text-[28px] font-extrabold sm:text-4xl">{t("noLevelTitle")}</h1>
        <p className="max-w-[640px] text-base text-navy-soft">{t("noLevelText")}</p>
        <ButtonLink href="/onboarding/test" variant="teal" size="lg" className="font-bold">
          {t("takeTest")}
        </ButtonLink>
      </Card>
    );
  }

  const level = status.level;
  const reached = CEFR.indexOf(level);
  const skipped = status.status === "skipped";
  const result = status.lastResult;

  return (
    <section className="flex flex-col items-center gap-10 rounded-[28px] bg-white p-6 sm:p-10 lg:flex-row lg:gap-12">
      <div
        className={cn(
          "flex size-[200px] shrink-0 flex-col items-center justify-center gap-1 rounded-full text-white shadow-[0_0_0_12px_var(--color-teal-100)]",
          skipped ? "bg-navy-soft" : "bg-navy",
        )}
        aria-label={t("levelAria", { level, label: t(`levelNames.${level}`) })}
        role="img"
      >
        <span className="font-display text-[64px] leading-none font-extrabold">{level}</span>
        <span className="px-4 text-center text-[15px] font-semibold text-yellow">{t(`levelNames.${level}`)}</span>
        {skipped && <span className="text-xs text-ink-soft">{t("estimated")}</span>}
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col gap-[18px]">
        <Eyebrow>{skipped ? t("estimatedEyebrow") : t("eyebrow")}</Eyebrow>
        <h1 className="text-[28px] font-extrabold sm:text-4xl">{skipped ? t("estimatedTitle", { level }) : name ? t("title", { name, level }) : t("titleNoName", { level })}</h1>
        <p className="max-w-[640px] text-base leading-relaxed text-navy-soft">{t(`levelDescriptions.${level}`)}</p>
        <ol className="grid max-w-[640px] grid-cols-6 gap-1.5" aria-label={t("cefrScale")}>
          {CEFR.map((l, i) => (
            <li key={l} className="flex flex-col gap-1.5" aria-current={l === level ? "step" : undefined}>
              <span className={cn("h-2.5 rounded-md", i <= reached ? "bg-teal-dark" : "bg-sand")} />
              <span className={cn("text-[13px]", l === level ? "font-bold text-navy" : "text-muted")}>{l}</span>
            </li>
          ))}
        </ol>
        {skipped ? (
          <div className="flex max-w-[640px] flex-col items-start gap-3 rounded-2xl bg-cream p-4">
            <p className="text-sm text-orange-text">{t("estimatedHint")}</p>
            <ButtonLink href="/onboarding/test" variant="teal" className="font-bold">
              {t("takeTest")}
            </ButtonLink>
          </div>
        ) : (
          <Link href="/onboarding/test" className="text-sm font-semibold text-teal-dark hover:text-navy">
            {t("retake")}
          </Link>
        )}
      </div>

      {result && !skipped && (
        <ul className="flex w-full shrink-0 flex-col gap-3.5 border-line-soft max-lg:border-t max-lg:pt-8 lg:w-[300px] lg:border-s lg:ps-10" aria-label={t("bySkill")}>
          {SECTIONS.map((s) => {
            const r = result.skills[s];
            const pct = r.level ? Math.round(((CEFR.indexOf(r.level) + 1) / CEFR.length) * 100) : 0;
            const weakest = r.level && CEFR.indexOf(r.level) < reached;
            return (
              <li key={s} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-sm">
                  <span>
                    {tsk(s)}
                    {r.selfAssessed && <span className="text-muted"> · {t("selfAssessed")}</span>}
                    {r.total > 0 && <span className="text-muted"> · {t("correctOf", { correct: r.correct, total: r.total })}</span>}
                  </span>
                  <strong>{r.skipped ? t("skippedSkill") : r.level}</strong>
                </div>
                <div className="h-2 rounded-md bg-line-soft">
                  <div className={cn("h-2 rounded-md", weakest ? "bg-orange" : "bg-sky")} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Recommendations({ recs, goal }: { recs: Recommendation[]; goal: PlacementStatus["goal"] }) {
  const t = useTranslations("onboarding.results");
  const tg = useTranslations("onboarding.goals");
  const tsp = useTranslations("common.specialties");
  const locale = useLocale() as Locale;
  const price = (cents: number) => (cents / 100).toLocaleString(intlTags[locale], { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 });
  const list = new Intl.ListFormat(intlTags[locale], { type: "conjunction" });
  const reason = (r: ReasonCode) => {
    if (r.id === "specialist") return t("reasons.specialist", { specialty: tsp.has(r.specialty as never) ? tsp(r.specialty as never) : r.specialty });
    if (r.id === "times") return t("reasons.times", { times: list.format(r.buckets.map((b) => tg(`times.${b}`).toLowerCase())) });
    if (r.id === "experience") return t("reasons.experience", { years: r.years });
    return t("reasons.topRated", { rating: r.rating.toLocaleString(intlTags[locale], { maximumFractionDigits: 1 }) });
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-extrabold sm:text-[28px]">{t("recommendedTitle")}</h2>
          <p className="text-base text-navy-soft">{goal ? t("recommendedSubtitle", { goal: tg(`goals.${goal}`) }) : t("recommendedSubtitleNoGoal")}</p>
        </div>
        <Link href="/teachers" className="shrink-0 font-semibold text-teal-dark hover:text-navy">
          {t("seeAll")}
        </Link>
      </div>

      {recs.length === 0 ? (
        <Card className="p-8 text-[15px] text-navy-soft">{t("noRecommendations")}</Card>
      ) : (
        <div className="grid gap-6 pt-3 md:grid-cols-2 xl:grid-cols-3">
          {recs.map(({ teacher: tc, codes }, i) => {
            const name = `${tc.firstName} ${tc.lastName}`;
            const rating = tc.ratingCount ? (tc.ratingAvgX100 / 100).toLocaleString(intlTags[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
            return (
              <article key={tc.id} className={cn("relative flex flex-col gap-4 rounded-3xl bg-white p-7", i === 0 && "border-2 border-teal")}>
                {i === 0 && <span className="absolute -top-3.5 start-6 rounded-full bg-teal-dark px-3 py-1.5 text-xs font-bold tracking-[1px] text-white">{t("bestMatch")}</span>}
                <div className="flex items-center gap-4">
                  <Avatar initials={`${tc.firstName[0] ?? ""}${tc.lastName[0] ?? ""}`} src={fileSrc(tc.avatarUrl)} size={72} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-[19px] font-bold">{name}</h3>
                    <span className="inline-flex flex-wrap items-center gap-1 text-sm text-muted">
                      {rating ? (
                        <>
                          {rating} <Icon name="star" size={14} className="text-orange" />
                        </>
                      ) : (
                        t("newTeacher")
                      )}{" "}
                      · {t("perLesson", { price: price(tc.priceCents) })}
                    </span>
                  </div>
                </div>
                {tc.headline && <p className="text-sm text-navy-soft">{tc.headline}</p>}
                {codes.length > 0 && (
                  <ul className="flex flex-col gap-2 text-sm">
                    {codes.map((c, k) => (
                      <CheckItem key={k}>{reason(c)}</CheckItem>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex gap-2.5">
                  <ButtonLink
                    href={tc.offersTrial ? `/teachers/${tc.slug}?type=trial` : `/teachers/${tc.slug}`}
                    className="flex-1 px-3"
                    aria-label={tc.offersTrial ? t("bookTrialWith", { name }) : t("bookLessonWith", { name })}
                  >
                    {tc.offersTrial ? t("bookTrial") : t("bookLesson")}
                  </ButtonLink>
                  <ButtonLink href={`/teachers/${tc.slug}`} variant="outline" className="flex-1 px-3" aria-label={t("profileOf", { name })}>
                    {t("profile")}
                  </ButtonLink>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Every question of the test with the student's answer, the right answer and a short explanation. */
function Corrections({ review }: { review: Review }) {
  const t = useTranslations("onboarding.results");
  const tsk = useTranslations("onboarding.skills");
  const total = review.sections.reduce((n, s) => n + s.total, 0);
  const correct = review.sections.reduce((n, s) => n + s.correct, 0);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="corrections-title">
      <div className="flex flex-col gap-2">
        <h2 id="corrections-title" className="text-2xl font-extrabold sm:text-[28px]">
          {t("correctionsTitle")}
        </h2>
        <p className="text-base text-navy-soft">{t("correctionsSubtitle", { correct, total })}</p>
      </div>
      <div className="flex flex-col gap-3">
        {SECTIONS.filter((s) => s !== "speaking").map((s) => {
          const parts = review.sections.filter((x) => x.section === s);
          if (!parts.length) return null;
          const c = parts.reduce((n, x) => n + x.correct, 0);
          const tot = parts.reduce((n, x) => n + x.total, 0);
          return (
            <details key={s} className="group rounded-3xl bg-white open:pb-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-lg font-bold">{tsk(s)}</span>
                <span className="flex items-center gap-3 text-sm text-muted">
                  {t("correctOf", { correct: c, total: tot })}
                  <Icon name="chevronDown" size={18} className="transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="flex flex-col gap-6 px-6 pb-4">
                {parts.map((part, i) => (
                  <ReviewPart key={i} part={part} />
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function ReviewPart({ part }: { part: ReviewSection }) {
  const t = useTranslations("onboarding.results");
  const LETTERS = ["A", "B", "C", "D"];
  return (
    <div className="flex flex-col gap-4 border-t border-line-soft pt-5">
      <span className="text-xs font-semibold tracking-[2px] text-muted uppercase">{t("levelPart", { level: part.level })}</span>
      {part.passage && (
        <details className="rounded-2xl bg-beige-2 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-teal-dark">{t("showText", { title: part.passage.title })}</summary>
          <p dir="ltr" className="mt-3 text-start text-sm leading-relaxed whitespace-pre-line">
            {part.passage.text}
          </p>
        </details>
      )}
      {part.transcript && (
        <details className="rounded-2xl bg-beige-2 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-teal-dark">{t("showTranscript")}</summary>
          <p dir="ltr" className="mt-3 text-start text-sm text-muted">
            {part.transcript.context}
          </p>
          <p dir="ltr" className="mt-2 text-start text-sm leading-relaxed whitespace-pre-line">
            {part.transcript.script}
          </p>
        </details>
      )}
      <ol className="flex flex-col gap-5">
        {part.questions.map((q) => (
          <li key={q.id} className="flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  q.isCorrect ? "bg-teal-100 text-teal-deep" : "bg-danger-100 text-danger-text",
                )}
              >
                <Icon name={q.isCorrect ? "check" : "x"} size={14} strokeWidth={3} />
                <span className="sr-only">{q.isCorrect ? t("right") : t("wrong")}</span>
              </span>
              <p dir="ltr" className="text-start text-[15px] font-semibold">
                {q.prompt.replace("___", "_____")}
              </p>
            </div>
            <ul dir="ltr" className="grid gap-1.5 ps-8 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const isAnswer = i === q.answer;
                const isChosen = i === q.chosen;
                return (
                  <li
                    key={i}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-start text-sm",
                      isAnswer
                        ? "border-teal-dark bg-teal-50 font-semibold text-teal-deep"
                        : isChosen
                          ? "border-danger bg-danger-100 text-danger-text line-through"
                          : "border-line-soft text-muted",
                    )}
                  >
                    {LETTERS[i]}. {o}
                    {isAnswer && <span className="sr-only"> — {t("correctAnswer")}</span>}
                    {isChosen && !isAnswer && <span className="sr-only"> — {t("yourAnswer")}</span>}
                  </li>
                );
              })}
            </ul>
            <p dir="ltr" className="ms-8 rounded-xl bg-sky-100 px-3 py-2 text-start text-sm text-navy">
              <strong>{t("why")}</strong> {q.explanation}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
