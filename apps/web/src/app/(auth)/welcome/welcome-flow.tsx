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
import { useApi } from "@/lib/use-api";

type Meta = {
  role?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  country?: string;
  nativeLanguage?: string;
  phone?: string;
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
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  const register = useCallback(
    async (p: Required<Pick<Meta, "firstName" | "lastName" | "birthDate">> & Meta) => {
      const created = await call<{ role: string }>("/me/register", {
        method: "POST",
        body: JSON.stringify({
          role: "student",
          email: user?.email,
          firstName: p.firstName,
          lastName: p.lastName,
          birthDate: p.birthDate,
          country: p.country || undefined,
          nativeLanguage: p.nativeLanguage || undefined,
          phone: p.phone || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      router.replace(created.role === "admin" ? "/admin" : (safeNext ?? "/onboarding/goals"));
    },
    [call, user, router, safeNext],
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
        if (m.birthDate && m.firstName && m.lastName) {
          try {
            await register({
              ...m,
              firstName: m.firstName,
              lastName: m.lastName,
              birthDate: m.birthDate,
            });
          } catch (err) {
            setError((err as Error).message);
            setPhase("form");
          }
        } else {
          setPhase("form");
        }
      }
    })();
  }, [loaded, call, user, router, safeNext, register, t]);

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
        <p className="text-base text-navy-soft">{t("welcome.subtitle")}</p>
      </div>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const get = (k: string) => String(d.get(k) ?? "").trim();
          if (ageOn(get("birthDate")) < MIN_STUDENT_AGE) {
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
        <Field label={t("fields.birthDate")} hint={t("fields.birthDateHint", { age: MIN_STUDENT_AGE })}>
          <Input name="birthDate" type="date" autoComplete="bday" max={latestBirthDate()} required />
        </Field>
        <Field label={t("fields.country")}>
          <CountrySelect name="country" autoComplete="country-name" defaultValue="" required placeholder={t("fields.selectCountry")} />
        </Field>
        <Field label={t("fields.nativeLanguage")} className="sm:col-span-2">
          <LanguageSelect name="nativeLanguage" defaultValue="" placeholder={t("fields.selectLanguage")} />
        </Field>
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
