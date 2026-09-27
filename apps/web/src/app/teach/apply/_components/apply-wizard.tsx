"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { initialApplication, steps, type Application } from "../_data";
import { ApprovalStep, IdentityStep, PersonalStep, ProfessionalStep, ReviewStep, StepPreviews, VideoStep } from "./steps";

export function ApplyWizard() {
  const t = useTranslations("apply.wizard");
  const ts = useTranslations("apply.steps");
  const [step, setStep] = useState(0);
  const [app, setApp] = useState<Application>(initialApplication);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const update = useCallback((patch: Partial<Application>) => setApp((a) => ({ ...a, ...patch })), []);

  const last = steps.length - 1;
  const submitStep = last - 1;
  const current = steps[step];

  function go(to: number) {
    setStep(to);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO(api): persist each step (draft application) and submit at step 5.
    if (step < last) go(step + 1);
  }

  const showPreviews = step === 1;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:gap-8",
        showPreviews ? "lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]" : "lg:grid-cols-[280px_minmax(0,1fr)]",
      )}
    >
      {/* Stepper */}
      <nav aria-label={t("navLabel")} className="flex min-w-0 flex-col gap-1 rounded-3xl bg-white p-5 lg:p-7">
        <h2 className="mb-2 text-lg font-bold lg:mb-4">{t("yourApplication")}</h2>
        <ol className="relative flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
          {steps.map((s, i) => {
            const state = i < step ? "done" : i === step ? "current" : "upcoming";
            const canJump = state === "done" && step < last;
            const inner = (
              <>
                <span
                  className={cn(
                    "flex size-[34px] shrink-0 items-center justify-center rounded-full font-display text-sm font-bold",
                    state === "done" && "bg-teal-dark text-white",
                    state === "current" && "bg-navy text-white",
                    state === "upcoming" && "border-2 border-line",
                  )}
                >
                  {state === "done" ? <Icon name="check" size={16} strokeWidth={2.6} /> : i + 1}
                </span>
                <span className={cn("text-[15px]", state === "current" ? "font-bold" : "sr-only lg:not-sr-only", state === "current" && "whitespace-nowrap")}>
                  {ts(`${s.id}.title`)}
                  {state === "done" && <span className="sr-only"> {t("completed")}</span>}
                </span>
              </>
            );
            return (
              <li key={s.id} aria-current={state === "current" ? "step" : undefined}>
                {canJump ? (
                  <button type="button" onClick={() => go(i)} className="flex w-full items-center gap-3.5 rounded-xl py-2.5 text-start hover:bg-beige lg:-mx-3 lg:w-[calc(100%+24px)] lg:px-3">
                    {inner}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-3.5 rounded-xl py-2.5",
                      state === "current" && "bg-teal-50 px-3 lg:-mx-3",
                      state === "upcoming" && "text-muted",
                    )}
                  >
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 rounded-[14px] bg-cream p-3.5 text-[13px] leading-normal text-orange-text lg:mt-[18px]">{t("usOnly")}</p>
      </nav>

      {/* Current step */}
      <form onSubmit={onSubmit} className="flex flex-col gap-6 rounded-3xl bg-white p-6 sm:p-9" aria-labelledby="apply-step-heading">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">
            {t("progress", { current: step + 1, total: steps.length })}
          </span>
          <h1 id="apply-step-heading" ref={headingRef} tabIndex={-1} className="text-[26px] font-extrabold focus:outline-none sm:text-[30px]">
            {ts(`${current.id}.heading`)}
          </h1>
        </div>

        {step === 0 && <PersonalStep app={app} update={update} />}
        {step === 1 && <ProfessionalStep app={app} update={update} />}
        {step === 2 && <IdentityStep app={app} update={update} />}
        {step === 3 && <VideoStep app={app} update={update} />}
        {step === 4 && <ReviewStep app={app} update={update} onEdit={go} />}
        {step === 5 && <ApprovalStep app={app} />}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-[22px]">
          {step > 0 && step < last ? (
            <button type="button" onClick={() => go(step - 1)} className="font-semibold text-teal-dark hover:text-navy">
              {t("back")}
            </button>
          ) : (
            <span />
          )}
          {step < submitStep && (
            <Button type="submit" variant="teal" className="h-auto min-h-[52px] px-8 py-3 font-bold">
              {ts(`${steps[step + 1].id}.continue`)}
            </Button>
          )}
          {step === submitStep && (
            <Button type="submit" variant="primary" className="h-auto min-h-[52px] px-8 py-3">
              {t("submit")}
            </Button>
          )}
          {step === last && (
            <ButtonLink href="/" variant="outline">
              {t("backHome")}
            </ButtonLink>
          )}
        </div>
      </form>

      {showPreviews && (
        <div className="hidden xl:block">
          <StepPreviews />
        </div>
      )}
    </div>
  );
}
