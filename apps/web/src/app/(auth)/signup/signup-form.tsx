"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { clerkMessage, useSignUpFlow } from "@/lib/auth-flows";
import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ageOn, latestBirthDate, MIN_STUDENT_AGE } from "@/lib/age";

/** Option values stay in English (stored on the profile); only the labels are translated. */
const countries = ["Brazil", "France", "Japan", "Mexico"] as const;
const nativeLanguages = ["Portuguese", "French", "Spanish", "Arabic"] as const;

export function SignupForm() {
  const t = useTranslations("auth");
  const flow = useSignUpFlow();
  const [ageError, setAgeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const birthDate = String(data.get("birthDate") ?? "");
        if (!birthDate || ageOn(birthDate) < MIN_STUDENT_AGE) {
          setAgeError(t("errors.minAgeSignup", { age: MIN_STUDENT_AGE }));
          return;
        }
        const get = (k: string) => String(data.get(k) ?? "").trim();
        const phone = get("phone") ? `${get("dialCode")} ${get("phone")}` : "";
        setError(null);
        setPending(true);
        flow
          .start({
            firstName: get("firstName"),
            lastName: get("lastName"),
            email: get("email"),
            password: String(data.get("password") ?? ""),
            birthDate,
            country: get("country"),
            nativeLanguage: get("nativeLanguage"),
            phone,
          })
          .catch((err) => setError(clerkMessage(err, t("errors.generic"))))
          .finally(() => setPending(false));
      }}
    >
      <Field label={t("fields.firstName")}>
        <Input name="firstName" autoComplete="given-name" placeholder={t("fields.firstNamePlaceholder")} required />
      </Field>
      <Field label={t("fields.lastName")}>
        <Input name="lastName" autoComplete="family-name" placeholder={t("fields.lastNamePlaceholder")} required />
      </Field>
      <Field label={t("fields.email")}>
        <Input name="email" type="email" autoComplete="email" placeholder={t("fields.emailPlaceholder")} required />
      </Field>
      <Field label={t("fields.password")}>
        <Input name="password" type="password" autoComplete="new-password" placeholder={t("signup.passwordPlaceholder")} minLength={8} required />
      </Field>
      <Field
        label={t("fields.birthDate")}
        className="sm:col-span-2"
        hint={
          ageError ? (
            <span role="alert" className="font-semibold text-danger-text">
              {ageError}
            </span>
          ) : (
            t("fields.birthDateHint", { age: MIN_STUDENT_AGE })
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
      <Field label={t("fields.country")}>
        <Select name="country" autoComplete="country-name" defaultValue="" required>
          <option value="" disabled>
            {t("fields.selectCountry")}
          </option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {t(`countries.${c}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("fields.nativeLanguage")}>
        <Select name="nativeLanguage" defaultValue="" required>
          <option value="" disabled>
            {t("fields.selectLanguage")}
          </option>
          {nativeLanguages.map((l) => (
            <option key={l} value={l}>
              {t(`languages.${l}`)}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
        <legend className="mb-1.5 text-sm font-semibold">{t("fields.phone")}</legend>
        <div className="flex gap-2">
          <Select name="dialCode" aria-label={t("fields.dialCode")} defaultValue="+55" className="w-[110px] shrink-0">
            <option>+55</option>
            <option>+33</option>
            <option>+1</option>
          </Select>
          <Input name="phone" type="tel" autoComplete="tel-national" aria-label={t("fields.phone")} placeholder={t("fields.phonePlaceholder")} className="min-w-0" />
        </div>
      </fieldset>
      <label className="flex items-start gap-2.5 text-sm leading-normal text-navy-soft sm:col-span-2">
        <input type="checkbox" name="terms" required className="mt-0.5 size-[18px] shrink-0" />
        <span>
          {t.rich("signup.terms", {
            terms: (c) => (
              <Link href="/terms" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link href="/privacy" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
                {c}
              </Link>
            ),
          })}
        </span>
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text sm:col-span-2">
          {error}
        </p>
      )}
      <Button type="submit" variant="teal" size="lg" className="mt-2.5 font-bold sm:col-span-2" disabled={pending || !flow.ready}>
        {pending ? t("signup.submitting") : t("signup.submit")}
      </Button>
    </form>
  );
}
