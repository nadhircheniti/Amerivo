"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FocusHeader } from "@/components/layout/focus-header";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card } from "@/components/ui/primitives";
import { API_URL, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import { SECTIONS, type AnswerResponse, type Cefr, type PlacementStatus, type Section, type Stage, type StartResponse } from "../../_lib/types";
import { GrammarStage, ListeningStage, ReadingStage, SpeakingStage } from "./stages";

const SECTION_ICON: Record<Section, IconName> = { grammar: "pen", reading: "book", listening: "play", speaking: "mic" };

type Phase =
  | { name: "loading" }
  | { name: "intro"; status: PlacementStatus | null }
  | { name: "stage"; attemptId: string; stage: Stage }
  | { name: "between"; attemptId: string; stage: Stage; finished: Section }
  | { name: "error"; message: string; retry: () => void };

export function TestFlow() {
  const t = useTranslations("onboarding.test");
  const ts = useTranslations("onboarding.skills");
  const router = useRouter();
  const { call, isLoaded, isSignedIn } = useApi();
  const [phase, setPhase] = useState<Phase>(API_URL ? { name: "loading" } : { name: "intro", status: null });
  const [busy, setBusy] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  /** Stages answered in the current section (only drives the progress bar). */
  const [inSection, setInSection] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  const fail = useCallback(
    (e: unknown, retry: () => void) => setPhase({ name: "error", message: e instanceof ApiError && e.status === 400 ? e.message : t("networkError"), retry }),
    [t],
  );

  const fetchStatus = useCallback(
    () =>
      call<PlacementStatus>("/student/placement")
        .then((status) => setPhase({ name: "intro", status }))
        .catch((e) => fail(e, () => loadStatusRef.current())),
    [call, fail],
  );
  const loadStatusRef = useRef(() => {});
  loadStatusRef.current = () => {
    setPhase({ name: "loading" });
    void fetchStatus();
  };
  const loadStatus = () => loadStatusRef.current();

  useEffect(() => {
    if (API_URL && isLoaded && isSignedIn) void fetchStatus();
  }, [isLoaded, isSignedIn, fetchStatus]);

  // Braces matter: recent browsers make scrollIntoView() return a Promise, and an arrow function
  // without braces would hand that Promise to React as the effect's cleanup → "i is not a function".
  const stageIndex = phase.name === "stage" ? phase.stage.stageIndex : -1;
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [phase.name, stageIndex]);

  async function start(restart = false) {
    if (!API_URL) return router.push("/onboarding/results");
    setBusy(true);
    try {
      const r = await call<StartResponse>("/student/placement/test", { method: "POST", body: JSON.stringify(restart ? { restart: true } : {}) });
      setInSection(0);
      setPhase({ name: "stage", attemptId: r.attemptId, stage: r.stage });
    } catch (e) {
      fail(e, () => void start(restart));
    } finally {
      setBusy(false);
    }
  }

  async function submit(attemptId: string, stage: Stage, body: { answers?: Record<string, number>; canDo?: Cefr[]; skipSection?: boolean }) {
    setBusy(true);
    try {
      const r = await call<AnswerResponse>("/student/placement/test/answer", { method: "POST", body: JSON.stringify({ attemptId, stageIndex: stage.stageIndex, ...body }) });
      if (r.done) return router.push("/onboarding/results");
      if (r.stage.section !== stage.section) {
        setInSection(0);
        setPhase({ name: "between", attemptId, stage: r.stage, finished: stage.section });
      } else {
        setInSection((n) => n + 1);
        setPhase({ name: "stage", attemptId, stage: r.stage });
      }
    } catch (e) {
      fail(e, () => setPhase({ name: "stage", attemptId, stage }));
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (!API_URL) return router.push("/onboarding/results");
    setBusy(true);
    try {
      await call("/student/placement/skip", { method: "POST" });
      router.push("/onboarding/results");
    } catch (e) {
      setBusy(false);
      fail(e, loadStatus);
    }
  }

  const current = phase.name === "stage" || phase.name === "between" ? phase.stage : null;
  const progress = current ? Math.round(((current.sectionIndex + (phase.name === "between" ? 0 : Math.min(inSection, 3) / 4 + 0.1)) / SECTIONS.length) * 100) : 0;

  return (
    <>
      <FocusHeader center={t("step")} right={{ href: "/student", label: phase.name === "stage" ? t("finishLater") : t("saveLater") }} progress={progress} />
      <main ref={top} className="mx-auto flex w-full max-w-[1100px] scroll-mt-4 flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
        {current && <SectionSteps active={current.sectionIndex} />}

        {phase.name === "loading" && (
          <Card className="p-10 text-center text-[15px] text-muted" role="status">
            {t("loading")}
          </Card>
        )}

        {phase.name === "error" && (
          <Card className="flex flex-col items-start gap-4 p-8" role="alert">
            <p className="text-[15px] font-semibold text-danger-text">{phase.message}</p>
            <Button variant="teal" onClick={phase.retry}>
              {t("retry")}
            </Button>
          </Card>
        )}

        {phase.name === "intro" && <Intro status={phase.status} busy={busy} onStart={start} onSkip={() => setConfirmSkip(true)} />}

        {phase.name === "between" && (
          <Card className="flex flex-col items-center gap-5 p-8 text-center sm:p-12">
            <span className="flex size-16 items-center justify-center rounded-full bg-teal-100 text-teal-dark">
              <Icon name="check" size={30} strokeWidth={2.5} />
            </span>
            <h1 className="text-2xl font-extrabold sm:text-[28px]">{t("sectionDone", { section: ts(phase.finished) })}</h1>
            <p className="max-w-[520px] text-[15px] text-navy-soft">
              {t("nextSection", { section: ts(phase.stage.section) })} {t(`sectionHints.${phase.stage.section}`)}
            </p>
            <Button variant="teal" size="lg" className="px-10 font-bold" onClick={() => setPhase({ name: "stage", attemptId: phase.attemptId, stage: phase.stage })}>
              {t("startSection", { section: ts(phase.stage.section) })}
            </Button>
          </Card>
        )}

        {phase.name === "stage" && (
          <Card className="flex flex-col gap-6 p-5 sm:p-8 lg:p-10">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-teal-100 text-teal-dark">
                <Icon name={SECTION_ICON[phase.stage.section]} size={20} />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-[2px] text-muted uppercase">{t("sectionOf", { n: phase.stage.sectionIndex + 1, total: SECTIONS.length })}</span>
                <span className="font-display text-lg font-bold">{ts(phase.stage.section)}</span>
              </div>
            </div>
            {phase.stage.kind === "grammar" && (
              <GrammarStage key={phase.stage.stageIndex} stage={phase.stage} busy={busy} onSubmit={(b) => submit(phase.attemptId, phase.stage, b)} />
            )}
            {phase.stage.kind === "reading" && (
              <ReadingStage key={phase.stage.stageIndex} stage={phase.stage} busy={busy} onSubmit={(b) => submit(phase.attemptId, phase.stage, b)} />
            )}
            {phase.stage.kind === "listening" && (
              <ListeningStage key={phase.stage.stageIndex} stage={phase.stage} busy={busy} onSubmit={(b) => submit(phase.attemptId, phase.stage, b)} />
            )}
            {phase.stage.kind === "speaking" && (
              <SpeakingStage key={phase.stage.stageIndex} stage={phase.stage} busy={busy} onSubmit={(b) => submit(phase.attemptId, phase.stage, b)} />
            )}
          </Card>
        )}

        {(phase.name === "stage" || phase.name === "between") && (
          <p className="text-center text-[13px] text-muted">
            {t("autosave")}{" "}
            <button type="button" className="font-semibold text-teal-dark underline-offset-2 hover:underline" onClick={() => setConfirmSkip(true)}>
              {t("skipInstead")}
            </button>
          </p>
        )}

        {confirmSkip && (
          <div role="dialog" aria-modal="true" aria-labelledby="skip-title" className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
            <div className="flex w-full max-w-[460px] flex-col gap-4 rounded-3xl bg-white p-7">
              <h2 id="skip-title" className="text-xl font-extrabold">
                {t("skipTitle")}
              </h2>
              <p className="text-[15px] leading-relaxed text-navy-soft">{t("skipText")}</p>
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setConfirmSkip(false)} disabled={busy}>
                  {t("skipCancel")}
                </Button>
                <Button variant="navy" onClick={skip} disabled={busy}>
                  {t("skipConfirm")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function SectionSteps({ active }: { active: number }) {
  const ts = useTranslations("onboarding.skills");
  const t = useTranslations("onboarding.test");
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label={t("sectionsLabel")}>
      {SECTIONS.map((s, i) => (
        <li key={s} aria-current={i === active ? "step" : undefined} className="flex flex-col gap-1.5">
          <span className={cn("h-1.5 rounded-full", i < active ? "bg-teal-dark" : i === active ? "bg-teal" : "bg-sand")} />
          <span className={cn("flex items-center gap-1.5 text-[13px]", i === active ? "font-bold text-navy" : "text-muted")}>
            {i < active && <Icon name="check" size={14} className="text-teal-dark" strokeWidth={2.5} />}
            {ts(s)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Intro({ status, busy, onStart, onSkip }: { status: PlacementStatus | null; busy: boolean; onStart: (restart?: boolean) => void; onSkip: () => void }) {
  const t = useTranslations("onboarding.test");
  const ts = useTranslations("onboarding.skills");
  const resume = !!status?.inProgress;
  const done = status?.status === "completed";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <Card className="flex flex-col gap-6 p-6 sm:p-10">
        <div className="flex flex-col gap-2">
          <span className="font-display text-xs font-semibold tracking-[3px] text-teal-dark uppercase">{t("eyebrow")}</span>
          <h1 className="text-[28px] font-extrabold sm:text-[34px]">{done ? t("retakeTitle") : resume ? t("resumeTitle") : t("title")}</h1>
          <p className="text-base leading-relaxed text-navy-soft">{done ? t("retakeText", { level: status?.level ?? "" }) : t("subtitle")}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s} className="flex items-start gap-3 rounded-2xl bg-beige-2 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-dark">
                <Icon name={SECTION_ICON[s]} size={18} />
              </span>
              <span className="flex flex-col gap-0.5">
                <strong className="font-display text-[15px]">{ts(s)}</strong>
                <span className="text-[13px] leading-snug text-muted">{t(`sectionHints.${s}`)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="teal" size="lg" className="px-9 font-bold" onClick={() => onStart(false)} disabled={busy}>
            {busy ? t("loading") : resume ? t("resume") : t("start")}
          </Button>
          {resume && (
            <button type="button" className="text-[15px] font-semibold text-teal-dark hover:text-navy" onClick={() => onStart(true)} disabled={busy}>
              {t("startOver")}
            </button>
          )}
        </div>
      </Card>

      <aside className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-3xl bg-navy p-7 text-white">
          <h2 className="text-xl font-bold text-white">{t("howTitle")}</h2>
          <ul className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink-soft">
            {(["how1", "how2", "how3", "how4"] as const).map((k) => (
              <li key={k} className="flex gap-2.5">
                <Icon name="check" size={18} className="mt-0.5 shrink-0 text-yellow" strokeWidth={2.5} />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <Card className="flex flex-col items-start gap-3 p-6">
          <h2 className="text-[17px] font-bold">{t("notNowTitle")}</h2>
          <p className="text-sm leading-relaxed text-navy-soft">{t("notNowText")}</p>
          {done ? (
            <Link href="/onboarding/results" className="text-[15px] font-semibold text-teal-dark hover:text-navy">
              {t("seeLastResult")}
            </Link>
          ) : (
            <Button variant="outline" onClick={onSkip} disabled={busy}>
              {t("skip")}
            </Button>
          )}
        </Card>
      </aside>
    </div>
  );
}
