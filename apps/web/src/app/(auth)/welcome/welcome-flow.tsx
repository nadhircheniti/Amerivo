"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { CountrySelect, LanguageSelect } from "@/components/ui/geo-selects";
import { ageOn, latestBirthDate, MIN_STUDENT_AGE } from "@/lib/age";
import { ApiError, API_URL } from "@/lib/api";
import { canOpen, clerkEnabled, homeForRole, spaceOf } from "@/lib/auth-config";
import { TERMS_VERSION } from "@/lib/legal";
import { safePath } from "@/lib/safe-path";
import { useApi } from "@/lib/use-api";
import Link from "next/link";

type Meta = {
  role?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  country?: string;
  nativeLanguage?: string;
  phone?: string;
  /** Version of the Terms accepted on the sign-up form. */
  termsVersion?: string;
};
type ClerkUserLite = {
  email: string;
  firstName: string;
  lastName: string;
  meta: Meta;
} | null;

function useClerkUserLite(): { loaded: boolean; user: ClerkUserLite } {
  const { isLoaded, user } = useUser();
  if (!isLoaded || !user) return { loaded: isLoaded, user: null };
  return {
    loaded: true,
    user: {
      email: user.primaryEmailAddress?.emailAddress ?? "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      meta: (user.unsafeMetadata ?? {}) as Meta,
    },
  };
}
const useNoUser = () => ({ loaded: true, user: null as ClerkUserLite });
const useUserLite = clerkEnabled ? useClerkUserLite : useNoUser;

/** Option values stay in English (stored on the profile); only the labels are translated. */

/**
 * Single landing page after any sign-in:
 * - existing Amerivo account → its space (student / teacher / admin), or ?next=
 * - new account with a complete sign-up profile → created automatically
 * - Google/Apple first sign-in → asks the missing details (date of birth for the 13+ rule…)
 * - teacher applicants (unsafeMetadata.role "teacher" or ?as=teacher) → teacher account (no birth date),
 *   then /teach/apply
 */
export function WelcomeFlow() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { call } = useApi();
  const { loaded, user } = useUserLite();
  const [phase, setPhase] = useState<"checking" | "form" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const started = useRef(false);

  const next = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next");
  const safeNext = next ? safePath(next, window.location.origin, "") || null : null;

  // Teacher applicants: role chosen at sign-up (unsafeMetadata) or ?as=teacher (Google/Apple from /signup?as=teacher).
  const asTeacher = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("as") === "teacher";
  const teacher = user?.meta.role === "teacher" || asTeacher;

  const register = useCallback(
    async (p: Required<Pick<Meta, "firstName" | "lastName">> & Meta) => {
      const common = {
        email: user?.email,
        firstName: p.firstName,
        lastName: p.lastName,
        country: p.country || undefined,
        phone: p.phone || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        // Only called after the user ticked "I accept the Terms" (sign-up form or the form below).
        acceptTerms: true,
      };
      const created = await call<{ role: string }>("/me/register", {
        method: "POST",
        body: JSON.stringify(teacher ? { role: "teacher", ...common } : { role: "student", ...common, birthDate: p.birthDate, nativeLanguage: p.nativeLanguage || undefined }),
      });
      router.replace(created.role === "admin" ? "/admin" : teacher ? "/teach/apply" : (safeNext ?? "/onboarding/goals"));
    },
    [call, user, router, safeNext, teacher],
  );

  useEffect(() => {
    if (!loaded || started.current) return;
    started.current = true;
    if (!API_URL || !clerkEnabled) {
      router.replace(safeNext ?? "/student");
      return;
    }
    (async () => {
      try {
        const me = await call<{ role: string; teacherStatus?: string | null }>("/me");
        // Only follow ?next= when it belongs to this role's space (an admin isn't sent to the student questionnaire).
        const nextSpace = safeNext ? spaceOf(safeNext) : null;
        // Admins may open every space for support, but after signing in they always start in /admin.
        const followNext =
          safeNext &&
          (me.role === "admin" ? nextSpace === "admin" : (nextSpace === null || canOpen(me.role, nextSpace)) && !(me.role !== "student" && safeNext.startsWith("/onboarding")));
        router.replace(followNext ? safeNext : homeForRole(me.role, me.teacherStatus));
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 401 || !/no amerivo account/i.test(e.message)) {
          setError(t("errors.unreachable"));
          setPhase("error");
          return;
        }
        const m = user?.meta ?? {};
        // Students need their birth date (13+ rule); teachers don't give one.
        if (m.firstName && m.lastName && (teacher ? m.country : m.birthDate) && m.termsVersion === TERMS_VERSION) {
          try {
            await register({ ...m, firstName: m.firstName, lastName: m.lastName });
          } catch (err) {
            setError((err as Error).message);
            setPhase("form");
          }
        } else {
          setPhase("form");
        }
      }
    })();
  }, [loaded, call, user, router, safeNext, register, t, teacher]);

  if (phase === "checking") {
    return (
      <p role="status" className="text-base text-navy-soft">
        {t("welcome.settingUp")}
      </p>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex max-w-[560px] flex-col gap-4">
        <p role="alert" className="rounded-xl bg-cream px-4 py-3 text-sm font-semibold text-orange-text">
          {error}
        </p>
        <Button variant="teal" onClick={() => window.location.reload()}>
          {t("welcome.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[600px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t("welcome.title")}</h1>
        <p className="text-base text-navy-soft">{teacher ? t("welcome.teacherSubtitle") : t("welcome.subtitle")}</p>
      </div>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const get = (k: string) => String(d.get(k) ?? "").trim();
          if (!teacher && ageOn(get("birthDate")) < MIN_STUDENT_AGE) {
            setError(t("errors.minAgeUse", { age: MIN_STUDENT_AGE }));
            return;
          }
          setError(null);
          setPending(true);
          register({
            firstName: get("firstName"),
            lastName: get("lastName"),
            birthDate: get("birthDate"),
            country: get("country"),
            nativeLanguage: get("nativeLanguage"),
            phone: user?.meta.phone,
          })
            .catch((err) => setError((err as Error).message))
            .finally(() => setPending(false));
        }}
      >
        <Field label={t("fields.firstName")}>
          <Input name="firstName" autoComplete="given-name" defaultValue={user?.meta.firstName || user?.firstName} required />
        </Field>
        <Field label={t("fields.lastName")}>
          <Input name="lastName" autoComplete="family-name" defaultValue={user?.meta.lastName || user?.lastName} required />
        </Field>
        {!teacher && (
          <Field label={t("fields.birthDate")} hint={t("fields.birthDateHint", { age: MIN_STUDENT_AGE })}>
            <Input name="birthDate" type="date" autoComplete="bday" max={latestBirthDate()} required />
          </Field>
        )}
        {/* Teachers: first name, last name and country only. */}
        <Field label={t("fields.country")} className={teacher ? "sm:col-span-2" : undefined}>
          <CountrySelect name="country" autoComplete="country-name" defaultValue={user?.meta.country ?? ""} required placeholder={t("fields.selectCountry")} />
        </Field>
        {!teacher && (
          <Field label={t("fields.nativeLanguage")} className="sm:col-span-2">
            <LanguageSelect name="nativeLanguage" defaultValue="" placeholder={t("fields.selectLanguage")} />
          </Field>
        )}
        <label className="flex items-start gap-2.5 text-sm leading-normal text-navy-soft sm:col-span-2">
          <input type="checkbox" name="terms" required className="mt-0.5 size-[18px] shrink-0" />
          <span>
            {t.rich("signup.terms", {
              terms: (c) => (
                <Link href="/terms" target="_blank" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
                  {c}
                </Link>
              ),
              privacy: (c) => (
                <Link href="/privacy" target="_blank" className="font-semibold text-teal-dark underline-offset-2 hover:underline">
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
        <Button type="submit" variant="teal" size="lg" className="font-bold sm:col-span-2" disabled={pending}>
          {pending ? t("welcome.saving") : t("welcome.submit")}
        </Button>
      </form>
    </div>
  );
}
