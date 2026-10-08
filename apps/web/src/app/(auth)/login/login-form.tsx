"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { clerkMessage, useSignInFlow, type SignInCodeStep } from "@/lib/auth-flows";

const nextParam = () => new URLSearchParams(window.location.search).get("redirect_url");

export function LoginForm() {
  const t = useTranslations("auth");
  const flow = useSignInFlow();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Set when Clerk asks for a code (new device or browser, two-step verification). */
  const [step, setStep] = useState<SignInCodeStep | null>(null);

  if (step) return <CodeStep step={step} flow={flow} onBack={() => setStep(null)} />;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        setPending(true);
        flow
          .signIn(String(data.get("email") ?? "").trim(), String(data.get("password") ?? ""), nextParam())
          .then((codeStep) => codeStep && setStep(codeStep))
          .catch((err) => setError(clerkMessage(err, t("errors.generic"))))
          .finally(() => setPending(false));
      }}
    >
      <Field label={t("fields.email")}>
        <Input name="email" type="email" autoComplete="email" placeholder={t("fields.emailPlaceholder")} required />
      </Field>
      <Field label={t("fields.password")}>
        <Input name="password" type="password" autoComplete="current-password" placeholder={t("login.passwordPlaceholder")} required />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2.5 text-navy-soft">
          <input type="checkbox" name="remember" className="size-[18px]" />
          {t("login.remember")}
        </label>
        <Link href="/forgot-password" className="font-semibold text-teal-dark hover:text-navy">
          {t("login.forgot")}
        </Link>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="teal" size="lg" className="mt-2.5 font-bold" disabled={pending || !flow.ready}>
        {pending ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  );
}

/**
 * Second step: Clerk sent a 6-digit code (it does so when the account signs in from a new device
 * or browser, to protect it if the password leaked), or asks for the authenticator app's code.
 */
function CodeStep({ step, flow, onBack }: { step: SignInCodeStep; flow: ReturnType<typeof useSignInFlow>; onBack: () => void }) {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const intro =
    step.strategy === "totp"
      ? t("login.codeIntroApp")
      : step.destination
        ? t(step.strategy === "phone_code" ? "login.codeIntroPhone" : "login.codeIntroEmail", { destination: step.destination })
        : t("login.codeIntroGeneric");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s+/g, "");
        setError(null);
        setPending(true);
        flow
          .verifyCode(step, code, nextParam())
          .catch((err) => {
            setError(clerkMessage(err, t("errors.generic")));
            setPending(false);
          });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-bold">{t("login.codeTitle")}</h2>
        <p className="text-sm leading-relaxed text-navy-soft">{intro}</p>
      </div>
      <Field label={t("login.codeLabel")}>
        <Input ref={input} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,8}" maxLength={8} placeholder="123456" required className="tracking-[0.3em]" />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="teal" size="lg" className="font-bold" disabled={pending}>
        {pending ? t("login.verifying") : t("login.verify")}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="font-semibold text-navy-soft hover:text-navy">
          {t("login.codeBack")}
        </button>
        {step.strategy !== "totp" && (
          <button
            type="button"
            className="font-semibold text-teal-dark hover:text-navy disabled:opacity-60"
            disabled={resent}
            onClick={() => {
              setError(null);
              flow
                .resendCode()
                .then(() => setResent(true))
                .catch((err) => setError(clerkMessage(err, t("errors.generic"))));
            }}
          >
            {resent ? t("login.codeResent") : t("login.codeResend")}
          </button>
        )}
      </div>
    </form>
  );
}
