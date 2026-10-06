"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { clerkMessage, useSignInFlow } from "@/lib/auth-flows";
import { CONTACT_MAILTO } from "@/lib/contact";

export function LoginForm() {
  const t = useTranslations("auth");
  const flow = useSignInFlow();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const next = new URLSearchParams(window.location.search).get("redirect_url");
        setError(null);
        setPending(true);
        flow
          .signIn(String(data.get("email") ?? "").trim(), String(data.get("password") ?? ""), next)
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
        <a href={CONTACT_MAILTO} className="font-semibold text-teal-dark hover:text-navy">
          {t("login.forgot")}
        </a>
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
