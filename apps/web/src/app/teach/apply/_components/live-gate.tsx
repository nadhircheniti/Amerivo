"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { clerkEnabled, homeForRole } from "@/lib/auth-config";
import { useApi } from "@/lib/use-api";
import { applicationFromProfile, editableStatus, firstIncompleteStep, steps, type Application, type IdentityStatus, type TeacherProfile } from "../_data";
import { LiveContext, type LiveApplication } from "./live-context";
import { Wizard } from "./wizard";

const IDENTITY_STEP = steps.findIndex((s) => s.id === "identity");
const APPROVAL_STEP = steps.length - 1;

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "otherRole"; role: string }
  | { kind: "ready"; profile: TeacherProfile; app: Application; step: number; identityReason: string | null };

/**
 * /teach/apply with the API: intro for visitors, a notice for student/admin accounts, and for
 * teachers the wizard resumed from GET /teacher/profile (or the status of a submitted application).
 */
export function LiveApply() {
  const t = useTranslations("apply.live");
  const router = useRouter();
  const { call, isLoaded, isSignedIn } = useApi();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await call<{ role: string }>("/me");
        if (cancelled) return;
        if (me.role !== "teacher") return setState({ kind: "otherRole", role: me.role });
        let profile = await call<TeacherProfile>("/teacher/profile");
        let step = editableStatus(profile.status) ? firstIncompleteStep(profile) : APPROVAL_STEP;
        let identityReason: string | null = null;
        // Back from Stripe Identity (…/teach/apply?step=identity): refresh the verification result.
        const params = new URLSearchParams(window.location.search);
        if (params.get("step") === "identity") {
          window.history.replaceState(null, "", window.location.pathname);
          if (editableStatus(profile.status)) {
            step = IDENTITY_STEP;
            try {
              const r = await call<{ identityStatus: IdentityStatus; reason?: string }>("/teacher/identity/sync", { method: "POST" });
              profile = { ...profile, identityStatus: r.identityStatus };
              identityReason = r.reason ?? null;
            } catch {
              /* the identity step offers "Check again" */
            }
          }
        }
        if (!cancelled) setState({ kind: "ready", profile, app: applicationFromProfile(profile), step, identityReason });
      } catch (e) {
        if (cancelled) return;
        // Signed in with Clerk but the Amerivo account doesn't exist yet: /welcome creates it.
        if (e instanceof ApiError && e.status === 401 && /no amerivo account/i.test(e.message)) {
          router.replace(`/welcome?${new URLSearchParams({ next: "/teach/apply", as: "teacher" })}`);
          return;
        }
        setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, call, router, attempt]);

  if (isLoaded && !isSignedIn) return <IntroCard />;

  if (state.kind === "loading") {
    return (
      <p role="status" className="rounded-3xl bg-white p-6 text-base text-navy-soft sm:p-9">
        {t("loading")}
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-white p-6 sm:p-9">
        <p role="alert" className="rounded-xl bg-cream px-4 py-3 text-sm font-semibold text-orange-text">
          {t("loadError")}
        </p>
        <Button
          variant="teal"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          {t("tryAgain")}
        </Button>
      </div>
    );
  }
  if (state.kind === "otherRole") return <OtherAccountCard role={state.role} />;
  return <LiveWizard key={attempt} call={call} initial={state} />;
}

function LiveWizard({ call, initial }: { call: LiveApplication["call"]; initial: Extract<State, { kind: "ready" }> }) {
  const [profile, setProfile] = useState(initial.profile);
  const [identityReason, setIdentityReason] = useState(initial.identityReason);
  const value = useMemo<LiveApplication>(() => ({ profile, setProfile, call, identityReason, setIdentityReason }), [profile, call, identityReason]);
  return (
    <LiveContext.Provider value={value}>
      <Wizard initialApp={initial.app} initialStep={initial.step} />
    </LiveContext.Provider>
  );
}

const requirements: { id: "native" | "identity" | "video" | "time"; icon: IconName }[] = [
  { id: "native", icon: "globe" },
  { id: "identity", icon: "shieldCheck" },
  { id: "video", icon: "video" },
  { id: "time", icon: "clock" },
];

/** Visitors who aren't signed in: what the application needs, then create an account or log in. */
function IntroCard() {
  const t = useTranslations("apply.live.intro");
  return (
    <section aria-labelledby="apply-intro-heading" className="grid gap-8 rounded-3xl bg-white p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <div className="flex flex-col items-start gap-4">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 id="apply-intro-heading" className="text-[28px] font-extrabold sm:text-[34px]">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-navy-soft">{t("text")}</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink href="/signup?as=teacher" variant="primary" size="lg">
            {t("create")}
            <Icon name="arrowRight" size={18} strokeWidth={2} />
          </ButtonLink>
          <ButtonLink href="/login?redirect_url=%2Fteach%2Fapply" variant="outline" size="lg">
            {t("login")}
          </ButtonLink>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[17px] font-bold">{t("needTitle")}</h2>
        <ul className="flex flex-col gap-3">
          {requirements.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-2xl bg-beige p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-teal-dark">
                <Icon name={r.icon} size={20} />
              </span>
              <span className="flex flex-col gap-0.5">
                <strong className="text-[15px] font-semibold">{t(`needs.${r.id}.title`)}</strong>
                <span className="text-sm leading-normal text-navy-soft">{t(`needs.${r.id}.text`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Signed in with a student or admin account: teachers need their own account (another e-mail). */
function OtherAccountCard({ role }: { role: string }) {
  const t = useTranslations("apply.live.otherAccount");
  const admin = role === "admin";
  return (
    <section aria-labelledby="apply-other-heading" className="flex max-w-[760px] flex-col items-start gap-4 rounded-3xl bg-white p-6 sm:p-9">
      <span className="flex size-14 items-center justify-center rounded-full bg-cream text-orange-dark">
        <Icon name="user" size={28} />
      </span>
      <h1 id="apply-other-heading" className="text-[26px] font-extrabold sm:text-[30px]">
        {admin ? t("adminTitle") : t("studentTitle")}
      </h1>
      <p className="text-base leading-relaxed text-navy-soft">{t("text")}</p>
      <p className="text-sm leading-normal text-muted">{t("signOutHint")}</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {clerkEnabled && (
          <SignOutButton redirectUrl="/signup?as=teacher">
            <Button variant="primary">{t("signOutCreate")}</Button>
          </SignOutButton>
        )}
        <ButtonLink href={homeForRole(role)} variant="outline">
          {admin ? t("goAdmin") : t("goStudent")}
        </ButtonLink>
      </div>
    </section>
  );
}
