"use client";

import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/student");
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
      <Button type="submit" variant="teal" size="lg" className="mt-2.5 font-bold">
        Log in
      </Button>
    </form>
  );
}
