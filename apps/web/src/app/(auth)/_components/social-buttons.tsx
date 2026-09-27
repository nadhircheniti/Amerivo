"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { clerkMessage, useSignInFlow, useSignUpFlow, type OAuthProvider } from "@/lib/auth-flows";

const base = "flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] border border-line bg-white text-[15px] font-semibold text-navy hover:bg-beige";

/** "Continue with Google / Apple" through Clerk (demo mode: goes straight to the next step). */
export function SocialButtons({ mode, next }: { mode: "signup" | "login"; next?: string }) {
  const t = useTranslations("auth");
  const signUp = useSignUpFlow();
  const signIn = useSignInFlow();
  const [error, setError] = useState<string | null>(null);
  const go = async (strategy: OAuthProvider) => {
    setError(null);
    try {
      if (mode === "signup") await signUp.oauth(strategy);
      else await signIn.oauth(strategy, next ?? new URLSearchParams(window.location.search).get("redirect_url"));
    } catch (e) {
      setError(clerkMessage(e, t("errors.generic")));
    }
  };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-text sm:col-span-2">
          {error}
        </p>
      )}
      <button type="button" className={base} onClick={() => void go("oauth_google")}>
        <span aria-hidden="true" className="font-display font-extrabold text-[#4285f4]">
          G
        </span>
        {t("social.google")}
      </button>
      <button type="button" className={base} onClick={() => void go("oauth_apple")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.9-.9-3.1-.8c-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3.1.7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-.9-2.5-3.8zM14.1 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3z" />
        </svg>
        {t("social.apple")}
      </button>
    </div>
  );
}
