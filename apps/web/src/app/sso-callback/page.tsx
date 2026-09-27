"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { clerkEnabled } from "@/lib/auth-config";

/** Google / Apple return here; Clerk finishes the sign-in and redirects to /welcome. */
export default function SsoCallbackPage() {
  const t = useTranslations("auth.sso");
  return (
    <main className="flex min-h-screen items-center justify-center bg-beige text-navy-soft">
      <p role="status">{t("signingIn")}</p>
      {clerkEnabled && <AuthenticateWithRedirectCallback />}
    </main>
  );
}
