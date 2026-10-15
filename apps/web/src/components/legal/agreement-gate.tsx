"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMe } from "@/components/layout/role-gate";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const SIGN_PAGE = "/teacher/agreement";

/**
 * Teacher space: a teacher who hasn't signed the Independent Teacher Agreement in force (new
 * version, or an account created before it existed) is taken to the signing page first.
 */
export function AgreementGate({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const { call, isLoaded, isSignedIn } = useApi();
  const pathname = usePathname();
  const router = useRouter();
  // Unknown account (local mode without Clerk): ask the API, which answers 403 to non-teachers.
  const isTeacher = !me || me.role === "teacher";

  useEffect(() => {
    if (!API_URL || !isLoaded || !isSignedIn || !isTeacher || pathname === SIGN_PAGE) return;
    let cancelled = false;
    call<{ signature: unknown }>("/teacher/agreement").then(
      (s) => !cancelled && !s.signature && router.replace(SIGN_PAGE),
      () => undefined, // API waking up: the next page load checks again
    );
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn, isTeacher, pathname, router]);

  return <>{children}</>;
}
