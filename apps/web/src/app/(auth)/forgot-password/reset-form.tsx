"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { clerkMessage, useResetPasswordFlow } from "@/lib/auth-flows";

const COOLDOWN = 30;
const MIN_PASSWORD = 8;

/** Step 1: e-mail → a code is sent. Step 2: code + new password → signed in. */
export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const flow = useResetPasswordFlow();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function send() {
    setError(null);
    setPending(true);
    try {
      await flow.sendCode(email.trim());
      setStep("code");
      setStatus(t("forgot.sent", { email: email.trim() }));
      setLeft(COOLDOWN);
    } catch (e) {
      setError(clerkMessage(e, t("errors.generic")));
    } finally {
      setPending(false);
    }
  }

  if (step === "email") {
    return (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t("forgot.title")}</h1>
          <p className="text-base text-navy-soft">{t("forgot.subtitle")}</p>
        </div>
        <form
          key="email-step"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Field label={t("fields.email")}>
            <Input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("fields.emailPlaceholder")} required />
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
              {error}
            </p>
          )}
          <Button type="submit" variant="teal" size="lg" className="font-bold" disabled={pending || !flow.ready}>
            {pending ? t("forgot.sending") : t("forgot.sendCode")}
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t("forgot.codeTitle")}</h1>
        <p role="status" className="text-base text-navy-soft">
          {status}
        </p>
      </div>
      {/* key: a fresh form, so the e-mail typed in step 1 isn't reused in the code field. */}
      <form
        key="code-step"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const code = String(d.get("code") ?? "").replace(/\s/g, "");
          const password = String(d.get("password") ?? "");
          if (password !== String(d.get("confirm") ?? "")) return setError(t("forgot.mismatch"));
          setError(null);
          setPending(true);
          flow
            .reset(code, password)
            .catch((err) => {
              setError(clerkMessage(err, t("errors.generic")));
              setPending(false);
            });
        }}
      >
        <Field label={t("verify.codeLabel")} hint={t("forgot.codeHint")} className="max-w-[320px]">
          <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="123456" required className="text-lg tracking-[6px]" />
        </Field>
        <Field label={t("forgot.newPassword")} hint={t("forgot.passwordHint", { min: MIN_PASSWORD })}>
          <Input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
        </Field>
        <Field label={t("forgot.confirmPassword")}>
          <Input name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Button type="submit" variant="teal" size="lg" className="font-bold" disabled={pending || !flow.ready}>
            {pending ? t("forgot.saving") : t("forgot.submit")}
          </Button>
          <Button variant="outline" size="lg" disabled={left > 0 || pending} onClick={() => void send()}>
            {left > 0 ? t("forgot.resendIn", { seconds: left }) : t("forgot.resend")}
          </Button>
        </div>
        <button type="button" className="self-start text-sm font-semibold text-teal-dark hover:text-navy" onClick={() => (setStep("email"), setError(null))}>
          {t("forgot.changeEmail")}
        </button>
      </form>
    </>
  );
}
