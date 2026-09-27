"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { clerkMessage, useSignUpFlow } from "@/lib/auth-flows";

const COOLDOWN = 30;

/** 6-digit email code sent by Clerk; on success the session starts and /welcome creates the account. */
export function VerifyCodeForm() {
  const t = useTranslations("auth");
  const flow = useSignUpFlow();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
        setError(null);
        setPending(true);
        flow
          .verify(code)
          .catch((err) => setError(clerkMessage(err, t("errors.generic"))))
          .finally(() => setPending(false));
      }}
    >
      <Field label={t("verify.codeLabel")} hint={t("verify.codeHint")} className="max-w-[320px]">
        <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="123456" required className="text-lg tracking-[6px]" />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Button type="submit" variant="teal" size="lg" className="font-bold" disabled={pending || !flow.ready}>
          {pending ? t("verify.checking") : t("verify.submit")}
          <Icon name="arrowRight" size={18} strokeWidth={2} />
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={left > 0}
          onClick={() => {
            setStatus("");
            flow
              .resend()
              .then(() => {
                setStatus(t("verify.codeResent"));
                setLeft(COOLDOWN);
              })
              .catch((err) => setError(clerkMessage(err, t("errors.generic"))));
          }}
        >
          {left > 0 ? t("verify.resendCodeIn", { seconds: left }) : t("verify.resendCode")}
        </Button>
      </div>
      <p role="status" className="text-sm text-teal-deep">
        {status}
      </p>
    </form>
  );
}
