"use client";

import { Show, SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { API_URL } from "@/lib/api";
import { clerkEnabled } from "@/lib/auth-config";
import { SAVE_EXIT_EVENT } from "./live-context";

const link = "text-[15px] font-semibold text-teal-dark hover:text-navy";

/** Right side of the application header: "Save & exit" (saves the current step in live mode) and "Log out". */
export function ApplyHeaderActions() {
  const t = useTranslations("apply.page");
  const tn = useTranslations("common.nav");
  const router = useRouter();
  return (
    <span className="flex items-center gap-5">
      {API_URL ? (
        <button
          type="button"
          className={link}
          onClick={() => {
            // The wizard handles the event (saves, then leaves); with nothing to save, just leave.
            const handled = !window.dispatchEvent(new Event(SAVE_EXIT_EVENT, { cancelable: true }));
            if (!handled) router.push("/");
          }}
        >
          {t("saveExit")}
        </button>
      ) : (
        <Link href="/" className={link}>
          {t("saveExit")}
        </Link>
      )}
      {clerkEnabled && (
        <Show when="signed-in">
          <SignOutButton redirectUrl="/teach/apply">
            <button type="button" className="text-[15px] font-medium text-muted hover:text-navy">
              {tn("logOut")}
            </button>
          </SignOutButton>
        </Show>
      )}
    </span>
  );
}
