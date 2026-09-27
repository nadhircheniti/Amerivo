"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth-config";

/** Google / Apple return here; Clerk finishes the sign-in and redirects to /welcome. */
export default function SsoCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-beige text-navy-soft">
      <p role="status">Signing you in…</p>
      {clerkEnabled && <AuthenticateWithRedirectCallback />}
    </main>
  );
}
