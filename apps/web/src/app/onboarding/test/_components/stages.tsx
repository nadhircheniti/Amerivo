"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Cefr, PublicQuestion, Stage } from "../../_lib/types";
import { useSpeech } from "../../_lib/use-speech";
import { Options, Prompt } from "./question";

type Answers = Record<string, number>;
type Submit = (body: { answers?: Answers; canDo?: Cefr[]; skipSection?: boolean }) => void;

const complete = (qs: PublicQuestion[], a: Answers) => qs.every((q) => a[q.id] !== undefined);

/** Grammar & vocabulary: one question per screen. */
export function GrammarStage({ stage, busy, onSubmit }: { stage: Extract<Stage, { kind: "grammar" }>; busy: boolean; onSubmit: Submit }) {
  const t = useTranslations("onboarding.test");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const q = stage.questions[i];
  const last = i === stage.questions.length - 1;
  const number = stage.answered + i + 1;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-muted">{t("questionNumber", { n: number })}</span>
        <h2 className="sr-only">{t("chooseAnswer")}</h2>
        <Prompt id={`p-${q.id}`} text={q.prompt} className="font-display text-[21px] font-semibold text-navy sm:text-2xl" />
        <span className="text-[13px] text-muted">{t("chooseAnswer")}</span>
      </div>
      <Options q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} labelledBy={`p-${q.id}`} />
      <StageFooter
        back={i > 0 ? () => setI(i - 1) : undefined}
        label={last ? t("continue") : t("next")}
        disabled={answers[q.id] === undefined || busy}
        busy={busy}
        onNext={() => (last ? onSubmit({ answers }) : setI(i + 1))}
      />
    </div>
  );
}

/** Reading: the text stays visible next to its 3 questions. */
export function ReadingStage({ stage, busy, onSubmit }: { stage: Extract<Stage, { kind: "reading" }>; busy: boolean; onSubmit: Submit }) {
  const t = useTranslations("onboarding.test");
  const [answers, setAnswers] = useState<Answers>({});
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      <article dir="ltr" className="flex flex-col gap-3 self-start rounded-2xl bg-beige-2 p-5 text-start sm:p-6 lg:sticky lg:top-6">
        <span className="text-xs font-semibold tracking-[2px] text-muted uppercase">{t("readText")}</span>
        <h2 className="font-display text-xl font-bold">{stage.passage.title}</h2>
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed whitespace-pre-line text-navy">{stage.passage.text}</div>
      </article>
      <QuestionList questions={stage.questions} answers={answers} setAnswers={setAnswers} start={stage.answered} />
      <div className="lg:col-span-2">
        <StageFooter label={t("continue")} disabled={!complete(stage.questions, answers) || busy} busy={busy} onNext={() => onSubmit({ answers })} />
      </div>
    </div>
  );
}

/** Listening: play the clip (2 plays max), then answer. The transcript is shown only in the corrections. */
export function ListeningStage({ stage, busy, onSubmit }: { stage: Extract<Stage, { kind: "listening" }>; busy: boolean; onSubmit: Submit }) {
  const t = useTranslations("onboarding.test");
  const speech = useSpeech();
  const [plays, setPlays] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const MAX = 2;
  const play = () => {
    setPlays((n) => n + 1);
    speech.speak(stage.clip.script, stage.clip.rate);
  };

  if (speech.state === "unsupported") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-cream p-6">
        <h2 className="font-display text-xl font-bold">{t("noAudioTitle")}</h2>
        <p className="text-[15px] text-navy-soft">{t("noAudioText")}</p>
        <Button variant="teal" onClick={() => onSubmit({ skipSection: true })} disabled={busy}>
          {t("skipListening")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-navy p-6 text-white sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={speech.state === "speaking" ? speech.stop : play}
          disabled={speech.state === "loading" || (plays >= MAX && speech.state !== "speaking")}
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-orange text-navy transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={speech.state === "speaking" ? t("stopAudio") : plays === 0 ? t("playAudio") : t("playAgain")}
        >
          <Icon name={speech.state === "speaking" ? "square" : "play"} size={26} strokeWidth={2.5} />
        </button>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold tracking-[2px] text-yellow uppercase">{t("listenEyebrow")}</span>
          <p dir="ltr" className="text-start text-[16px] font-semibold">
            {stage.clip.context}
          </p>
          <p className="text-[13px] text-ink-soft" aria-live="polite">
            {speech.state === "speaking" ? t("playing") : plays >= MAX ? t("noPlaysLeft") : t("playsLeft", { count: MAX - plays })}
          </p>
        </div>
      </div>
      {plays === 0 ? (
        <p className="text-[15px] text-navy-soft">{t("listenFirst")}</p>
      ) : (
        <QuestionList questions={stage.questions} answers={answers} setAnswers={setAnswers} start={stage.answered} />
      )}
      <StageFooter label={t("continue")} disabled={plays === 0 || !complete(stage.questions, answers) || busy} busy={busy} onNext={() => onSubmit({ answers })} />
    </div>
  );
}

/** Speaking: honest self-assessment with "I can…" statements (checked later by the teacher in class). */
export function SpeakingStage({ stage, busy, onSubmit }: { stage: Extract<Stage, { kind: "speaking" }>; busy: boolean; onSubmit: Submit }) {
  const t = useTranslations("onboarding.test");
  const [checked, setChecked] = useState<Cefr[]>([]);
  const toggle = (l: Cefr) => setChecked((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l]));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[22px] font-bold">{t("speakingTitle")}</h2>
        <p className="text-[15px] text-navy-soft">{t("speakingHint")}</p>
      </div>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">{t("speakingTitle")}</legend>
        {stage.statements.map((s) => (
          <label
            key={s.level}
            className={cn(
              "flex cursor-pointer items-start gap-3.5 rounded-2xl border bg-white px-4 py-3.5 text-[15px]",
              checked.includes(s.level) ? "border-2 border-teal-dark bg-teal-50" : "border-line hover:border-navy-soft",
            )}
          >
            <input type="checkbox" checked={checked.includes(s.level)} onChange={() => toggle(s.level)} className="mt-0.5 size-5 shrink-0" />
            <span dir="ltr" className="text-start">
              {s.statement}
            </span>
          </label>
        ))}
      </fieldset>
      <StageFooter label={t("seeResult")} disabled={busy} busy={busy} onNext={() => onSubmit({ canDo: checked })} />
    </div>
  );
}

function QuestionList({
  questions,
  answers,
  setAnswers,
  start,
}: {
  questions: PublicQuestion[];
  answers: Answers;
  setAnswers: (fn: (a: Answers) => Answers) => void;
  start: number;
}) {
  const t = useTranslations("onboarding.test");
  return (
    <ol className="flex flex-col gap-7">
      {questions.map((q, i) => (
        <li key={q.id} className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-muted">{t("questionNumber", { n: start + i + 1 })}</span>
          <Prompt id={`p-${q.id}`} text={q.prompt} className="text-[17px] font-semibold text-navy" />
          <Options q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} labelledBy={`p-${q.id}`} />
        </li>
      ))}
    </ol>
  );
}

function StageFooter({ back, label, disabled, busy, onNext }: { back?: () => void; label: string; disabled: boolean; busy: boolean; onNext: () => void }) {
  const t = useTranslations("onboarding.test");
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-5">
      {back ? (
        <button type="button" onClick={back} className="text-[15px] font-semibold text-teal-dark hover:text-navy">
          {t("previous")}
        </button>
      ) : (
        <span />
      )}
      <Button variant="teal" size="lg" className="px-9 font-bold" disabled={disabled} onClick={onNext}>
        {busy ? t("checking") : label}
      </Button>
    </div>
  );
}
