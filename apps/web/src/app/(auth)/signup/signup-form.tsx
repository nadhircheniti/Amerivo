"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ageOn, latestBirthDate, MIN_STUDENT_AGE } from "@/lib/age";

export function SignupForm() {
  const router = useRouter();
  const [ageError, setAgeError] = useState<string | null>(null);

  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const birthDate = String(data.get("birthDate") ?? "");
        if (!birthDate || ageOn(birthDate) < MIN_STUDENT_AGE) {
          setAgeError(`You must be at least ${MIN_STUDENT_AGE} years old to create an account.`);
          return;
        }
        const email = String(data.get("email") ?? "");
        router.push(`/verify-email?${new URLSearchParams({ email })}`);
      }}
    >
      <Field label="First name">
        <Input name="firstName" autoComplete="given-name" defaultValue="Maria" required />
      </Field>
      <Field label="Last name">
        <Input name="lastName" autoComplete="family-name" placeholder="Your last name" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required />
      </Field>
      <Field
        label="Date of birth"
        className="sm:col-span-2"
        hint={
          ageError ? (
            <span role="alert" className="font-semibold text-danger-text">
              {ageError}
            </span>
          ) : (
            `Amerivo is for learners aged ${MIN_STUDENT_AGE} and over.`
          )
        }
      >
        <Input
          name="birthDate"
          type="date"
          autoComplete="bday"
          max={latestBirthDate()}
          required
          aria-invalid={ageError ? true : undefined}
          onChange={() => setAgeError(null)}
          className="sm:max-w-[260px]"
        />
      </Field>
      <Field label="Country">
        <Select name="country" autoComplete="country-name" defaultValue="" required>
          <option value="" disabled>
            Select your country
          </option>
          <option>Brazil</option>
          <option>France</option>
          <option>Japan</option>
          <option>Mexico</option>
        </Select>
      </Field>
      <Field label="Native language">
        <Select name="nativeLanguage" defaultValue="" required>
          <option value="" disabled>
            Select a language
          </option>
          <option>Portuguese</option>
          <option>French</option>
          <option>Spanish</option>
          <option>Arabic</option>
        </Select>
      </Field>
      <fieldset className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
        <legend className="mb-1.5 text-sm font-semibold">Phone number</legend>
        <div className="flex gap-2">
          <Select name="dialCode" aria-label="Country code" defaultValue="+55" className="w-[110px] shrink-0">
            <option>+55</option>
            <option>+33</option>
            <option>+1</option>
          </Select>
          <Input name="phone" type="tel" autoComplete="tel-national" aria-label="Phone number" placeholder="For lesson reminders by SMS" className="min-w-0" />
        </div>
      </fieldset>
      <label className="flex items-start gap-2.5 text-sm leading-normal text-navy-soft sm:col-span-2">
        <input type="checkbox" name="terms" required className="mt-0.5 size-[18px] shrink-0" />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
            Privacy Policy
          </Link>{" "}
          (GDPR / CCPA).
        </span>
      </label>
      <Button type="submit" variant="teal" size="lg" className="mt-2.5 font-bold sm:col-span-2">
        Create account
      </Button>
    </form>
  );
}
