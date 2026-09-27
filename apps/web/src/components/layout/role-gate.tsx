"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, API_URL } from "@/lib/api";
import { clerkEnabled, homeForRole, canOpen, type Role } from "@/lib/auth-config";
import { useApi } from "@/lib/use-api";
import { useTranslations } from "next-intl";

/**
 * Shows a space (student / teacher / admin) only to the right role, checked with the API.
 * Wrong role → sent to their own space. Signed in without an Amerivo account → /welcome.
 * Demo mode (no Clerk or no API): screens stay open so the design can be reviewed.
 */
/** The signed-in Amerivo account (from GET /me), available inside a RoleGate. */
export type Me = { id: string; role: Role; firstName: string; lastName: string; email: string; teacherStatus?: string | null };
const MeContext = createContext<Me | null>(null);
export const useMe = () => useContext(MeContext);

export function RoleGate({ space, children }: { space: Role; children: ReactNode }) {
  if (!clerkEnabled || !API_URL) return <>{children}</>;
  return <CheckedGate space={space}>{children}</CheckedGate>;
}

function CheckedGate({ space, children }: { space: Role; children: ReactNode }) {
  const { call, isLoaded, isSignedIn } = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "ok" | "error">("checking");
  const [me, setMe] = useState<Me | null>(null);
  const t = useTranslations("common.gate");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/login?${new URLSearchParams({ redirect_url: pathname })}`);
      return;
    }
    let cancelled = false;
    call<Me>("/me")
      .then((account) => {
        if (cancelled) return;
        setMe(account);
        // A teacher whose application isn't approved yet goes back to the application.
        if (account.role === "teacher" && space === "teacher" && account.teacherStatus !== "approved") router.replace("/teach/apply");
        else if (canOpen(account.role, space)) setState("ok");
        else router.replace(homeForRole(account.role, account.teacherStatus));
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) router.replace(`/welcome?${new URLSearchParams({ next: pathname })}`);
        else setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn, router, pathname, space]);

  if (state === "ok") return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-beige px-6 text-center text-navy-soft" role="status">
      {state === "checking" ? (
        t("loading")
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p>{t("unreachable")}</p>
          <button type="button" className="font-semibold text-teal-dark underline" onClick={() => window.location.reload()}>
            {t("tryAgain")}
          </button>
        </div>
      )}
    </div>
  );
}
