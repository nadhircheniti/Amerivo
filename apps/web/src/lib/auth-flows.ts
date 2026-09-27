"use client";

/**
 * Sign-up / sign-in flows. With Clerk enabled they use Clerk's custom-flow hooks (our own
 * forms, Clerk handles passwords, email codes and Google/Apple). In demo mode they just navigate.
 *
 * The profile collected at sign-up (birth date, country…) is kept in Clerk's unsafeMetadata and
 * turned into an Amerivo account by /welcome, the single landing page after every sign-in.
 */
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { clerkEnabled } from "./auth-config";

export type SignupProfile = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  country: string;
  nativeLanguage: string;
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

/* ------------------------------------------------------------------ sign-up */
function useClerkSignUpFlow() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const t = useTranslations("auth.errors");
  return {
    ready: isLoaded,
    async start(p: SignupProfile) {
      if (!isLoaded) return;
      await signUp.create({
        emailAddress: p.email,
        password: p.password,
        unsafeMetadata: {
          role: "student",
          firstName: p.firstName,
          lastName: p.lastName,
          birthDate: p.birthDate,
          country: p.country,
          nativeLanguage: p.nativeLanguage,
          phone: p.phone,
        },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push(`/verify-email?${new URLSearchParams({ email: p.email })}`);
    },
    async verify(code: string) {
      if (!isLoaded) return;
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status !== "complete" || !res.createdSessionId) throw new Error(t("signupIncomplete"));
      await setActive({ session: res.createdSessionId });
      router.push(welcome("/onboarding/goals"));
    },
    async resend() {
      if (!isLoaded) return;
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    },
    async oauth(strategy: OAuthProvider) {
      if (!isLoaded) return;
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: welcome("/onboarding/goals"),
      });
    },
  };
}

function useDemoSignUpFlow() {
  const router = useRouter();
  return {
    ready: true,
    async start(p: SignupProfile) {
      router.push(`/verify-email?${new URLSearchParams({ email: p.email })}`);
    },
    async verify() {
      router.push("/onboarding/goals");
    },
    async resend() {},
    async oauth() {
      router.push("/onboarding/goals");
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
