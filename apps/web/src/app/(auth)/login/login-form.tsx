"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { clerkMessage, useSignInFlow } from "@/lib/auth-flows";

export function LoginForm() {
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
          .catch((err) => setError(clerkMessage(err)))
          .finally(() => setPending(false));
      }}
    >
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" placeholder="Your password" required />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2.5 text-navy-soft">
          <input type="checkbox" name="remember" className="size-[18px]" />
          Keep me logged in
        </label>
        <a href="mailto:support@amerivo.example" className="font-semibold text-teal-dark hover:text-navy">
          Forgot password?
        </a>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="teal" size="lg" className="mt-2.5 font-bold" disabled={pending || !flow.ready}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
