"use client";

/**
 * Sign-up / sign-in flows. With Clerk enabled they use Clerk's custom-flow hooks (our own
 * forms, Clerk handles passwords, email codes and Google/Apple). In demo mode they just navigate.
 *
 * The profile collected at sign-up (birth date, country…) is kept in Clerk's unsafeMetadata and
 * turned into an Amerivo account by /welcome, the single landing page after every sign-in.
 * Teacher applicants sign up with role "teacher" (/signup?as=teacher) and continue to /teach/apply.
 */
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { clerkEnabled } from "./auth-config";
import { TERMS_VERSION } from "./legal";

/** "student" (default) or "teacher" (applicant: no birth date / native language, lands on /teach/apply). */
export type SignupRole = "student" | "teacher";
export type SignupProfile = {
  role?: SignupRole;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** Students only (13+ rule). */
  birthDate?: string;
  country: string;
  /** Students only. */
  nativeLanguage?: string;
  phone: string;
};
export type OAuthProvider = "oauth_google" | "oauth_apple";

/** Readable message from a Clerk error (Clerk localizes its own messages); `fallback` is the translated generic error. */
export function clerkMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  const err = e as {
    errors?: { longMessage?: string; message?: string }[];
    message?: string;
  };
  return err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || fallback;
}

const welcome = (next?: string | null) => `/welcome${next ? `?${new URLSearchParams({ next })}` : ""}`;
/** Where a teacher applicant goes once signed up: /welcome creates the teacher account, then the application. */
const TEACHER_APPLY = "/teach/apply";
const teacherWelcome = (oauth = false) => `/welcome?${new URLSearchParams(oauth ? { next: TEACHER_APPLY, as: "teacher" } : { next: TEACHER_APPLY })}`;
const verifyUrl = (email: string, role?: SignupRole) => `/verify-email?${new URLSearchParams(role === "teacher" ? { email, as: "teacher" } : { email })}`;

/* ------------------------------------------------------------------ sign-up */
function useClerkSignUpFlow() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const t = useTranslations("auth.errors");
  return {
    ready: isLoaded,
    async start(p: SignupProfile) {
      if (!isLoaded) return;
      const teacher = p.role === "teacher";
      await signUp.create({
        emailAddress: p.email,
        password: p.password,
        // termsVersion: the sign-up form's "I accept the Terms" box (required) — /welcome sends it to the API.
        unsafeMetadata: teacher
          ? { role: "teacher", firstName: p.firstName, lastName: p.lastName, country: p.country, phone: p.phone, termsVersion: TERMS_VERSION }
          : {
              role: "student",
              firstName: p.firstName,
              lastName: p.lastName,
              birthDate: p.birthDate,
              country: p.country,
              nativeLanguage: p.nativeLanguage,
              phone: p.phone,
              termsVersion: TERMS_VERSION,
            },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push(verifyUrl(p.email, p.role));
    },
    async verify(code: string) {
      if (!isLoaded) return;
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status !== "complete" || !res.createdSessionId) throw new Error(t("signupIncomplete"));
      await setActive({ session: res.createdSessionId });
      const teacher = (res.unsafeMetadata as { role?: string } | undefined)?.role === "teacher";
      router.push(teacher ? teacherWelcome() : welcome("/onboarding/goals"));
    },
    async resend() {
      if (!isLoaded) return;
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    },
    async oauth(strategy: OAuthProvider, role: SignupRole = "student") {
      if (!isLoaded) return;
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: role === "teacher" ? teacherWelcome(true) : welcome("/onboarding/goals"),
        ...(role === "teacher" ? { unsafeMetadata: { role } } : {}),
      });
    },
  };
}

function useDemoSignUpFlow() {
  const router = useRouter();
  return {
    ready: true,
    async start(p: SignupProfile) {
      router.push(verifyUrl(p.email, p.role));
    },
    async verify() {
      router.push("/onboarding/goals");
    },
    async resend() {},
    async oauth(_strategy: OAuthProvider, role: SignupRole = "student") {
      router.push(role === "teacher" ? TEACHER_APPLY : "/onboarding/goals");
    },
  };
}

export const useSignUpFlow = clerkEnabled ? useClerkSignUpFlow : useDemoSignUpFlow;

/* ------------------------------------------------------------------ sign-in */
function useClerkSignInFlow() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const t = useTranslations("auth.errors");
  return {
    ready: isLoaded,
    async signIn(email: string, password: string, next?: string | null) {
      if (!isLoaded) return;
      const res = await signIn.create({ identifier: email, password });
      if (res.status !== "complete" || !res.createdSessionId) {
        throw new Error(t("extraVerification"));
      }
      await setActive({ session: res.createdSessionId });
      router.push(welcome(next));
    },
    async oauth(strategy: OAuthProvider, next?: string | null) {
      if (!isLoaded) return;
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: welcome(next),
      });
    },
  };
}

function useDemoSignInFlow() {
  const router = useRouter();
  return {
    ready: true,
    async signIn(_email: string, _password: string, next?: string | null) {
      router.push(next || "/student");
    },
    async oauth(_strategy: OAuthProvider, next?: string | null) {
      router.push(next || "/student");
    },
  };
}

export const useSignInFlow = clerkEnabled ? useClerkSignInFlow : useDemoSignInFlow;
