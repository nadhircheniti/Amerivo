"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { editableStatus, initialApplication, stepPayload, steps, type Application } from "../_data";
import { SAVE_EXIT_EVENT, useLive } from "./live-context";
import { ApprovalStep, IdentityStep, PersonalStep, ProfessionalStep, ReviewStep, StepPreviews, VideoStep } from "./steps";

const last = steps.length - 1;
const submitStep = last - 1;

/**
 * The 6-step application. Demo mode: local state only. Live mode (inside <LiveContext>): every
 * "Continue" saves the step with PUT /teacher/profile, the review step submits the application.
 */
export function Wizard({ initialApp = initialApplication, initialStep = 0 }: { initialApp?: Application; initialStep?: number }) {
  const t = useTranslations("apply.wizard");
  const ts = useTranslations("apply.steps");
  const live = useLive();
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [app, setApp] = useState<Application>(initialApp);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const update = useCallback((patch: Partial<Application>) => {
    setApp((a) => ({ ...a, ...patch }));
    setSaved(false);
  }, []);

  const current = steps[step];
  const editable = !live || editableStatus(live.profile.status);

  function go(to: number) {
    setStep(to);
    setError(null);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function fail(e: unknown) {
    setError(e instanceof ApiError ? e.message : t("saveError"));
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  /** PUT /teacher/profile with the fields of step `i` (no-op in demo mode and for steps without fields). */
  const saveStep = useCallback(
    async (i: number, a: Application) => {
      const body = live && editableStatus(live.profile.status) ? stepPayload(steps[i].id, a) : null;
      if (!live || !body) return;
      await live.call<{ status: string }>("/teacher/profile", { method: "PUT", body: JSON.stringify(body) });
      if (steps[i].id === "video") live.setProfile((p) => ({ ...p, introVideoUrl: a.videoUrl.trim() || null }));
    },
    [live],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!live) {
      if (step < last) go(step + 1);
      return;
    }
    const id = current.id;
    if (id === "professional" && !app.subjects.length) return fail(new ApiError(400, t("pickSubject")));
    if (id === "identity" && live.profile.identityStatus !== "pending" && live.profile.identityStatus !== "verified") {
      return fail(new ApiError(400, t("identityRequired")));
    }
    setError(null);
    setPending(true);
    try {
      await saveStep(step, app);
      if (id === "review") {
        const res = await live.call<{ status: "pending" }>("/teacher/application/submit", { method: "POST" });
        live.setProfile((p) => ({ ...p, status: res?.status ?? "pending", review: null }));
        setSaved(false);
        go(last);
      } else {
        setSaved(true);
        go(step + 1);
      }
    } catch (err) {
      fail(err);
    } finally {
      setPending(false);
    }
  }

  // "Save & exit" in the header: save the current step (without the Continue checks), then leave.
  const exitRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    exitRef.current = async () => {
      setError(null);
      setPending(true);
      try {
        if (step < submitStep + 1) await saveStep(step, app);
        router.push("/");
      } catch (err) {
        fail(err);
      } finally {
        setPending(false);
      }
    };
  });
  useEffect(() => {
    if (!live) return;
    const onExit = (e: Event) => {
      e.preventDefault();
      void exitRef.current();
    };
    window.addEventListener(SAVE_EXIT_EVENT, onExit);
    return () => window.removeEventListener(SAVE_EXIT_EVENT, onExit);
  }, [live]);

  const showPreviews = step === 1 && !live;

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
            const canJump = state === "done" && step < last && !pending;
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
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className="flex w-full items-center gap-3.5 rounded-xl py-2.5 text-start hover:bg-beige lg:-mx-3 lg:w-[calc(100%+24px)] lg:px-3"
                  >
                    {inner}
                  </button>
                ) : (
                  <div className={cn("flex items-center gap-3.5 rounded-xl py-2.5", state === "current" && "bg-teal-50 px-3 lg:-mx-3", state === "upcoming" && "text-muted")}>
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
      <form onSubmit={onSubmit} className="flex flex-col gap-6 rounded-3xl bg-white p-6 sm:p-9" aria-labelledby="apply-step-heading" aria-busy={pending || undefined}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{t("progress", { current: step + 1, total: steps.length })}</span>
          <h1 id="apply-step-heading" ref={headingRef} tabIndex={-1} className="text-[26px] font-extrabold focus:outline-none sm:text-[30px]">
            {ts(`${current.id}.heading`)}
          </h1>
        </div>

        {step === 0 && <PersonalStep app={app} update={update} />}
        {step === 1 && <ProfessionalStep app={app} update={update} />}
        {step === 2 && <IdentityStep app={app} update={update} />}
        {step === 3 && <VideoStep app={app} update={update} />}
        {step === 4 && <ReviewStep app={app} update={update} onEdit={go} />}
        {step === 5 && <ApprovalStep app={app} onEdit={() => go(0)} />}

        {error && (
          <p ref={errorRef} role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-[22px]">
          {step > 0 && step < last ? (
            <button type="button" onClick={() => go(step - 1)} disabled={pending} className="font-semibold text-teal-dark hover:text-navy disabled:opacity-50">
              {t("back")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-4">
            <span role="status" className="flex items-center gap-1.5 text-sm text-teal-deep">
              {live && saved && !pending && (
                <>
                  <Icon name="check" size={14} strokeWidth={2.4} />
                  {t("saved")}
                </>
              )}
            </span>
            {editable && step < submitStep && (
              <Button type="submit" variant="teal" disabled={pending} className="h-auto min-h-[52px] px-8 py-3 font-bold">
                {pending ? t("saving") : ts(`${steps[step + 1].id}.continue`)}
              </Button>
            )}
            {editable && step === submitStep && (
              <Button type="submit" variant="primary" disabled={pending} className="h-auto min-h-[52px] px-8 py-3">
                {pending ? t("submitting") : t("submit")}
              </Button>
            )}
            {step === last && (
              <ButtonLink href="/" variant="outline">
                {t("backHome")}
              </ButtonLink>
            )}
          </div>
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
