"use client";

import { Show, SignOutButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { clerkEnabled } from "@/lib/auth-config";

function GuestLinks() {
  const t = useTranslations("common.nav");
  return (
    <>
      <Link href="/login" className="text-sm font-medium whitespace-nowrap text-navy hover:text-teal-dark sm:text-base">
        {t("logIn")}
      </Link>
      <ButtonLink href="/signup" size="sm" className="px-4 font-semibold whitespace-nowrap sm:px-6">
        {t("getStarted")}
      </ButtonLink>
    </>
  );
}

/** Right side of the public header: guest links, or "My space" + account menu when signed in. */
export function HeaderAuth() {
  const t = useTranslations("common.nav");
  if (!clerkEnabled) return <GuestLinks />;
  return (
    <>
      <Show when="signed-out">
        <GuestLinks />
      </Show>
      <Show when="signed-in">
        <ButtonLink href="/welcome" size="sm" variant="teal" className="px-6 font-semibold">
          {t("mySpace")}
        </ButtonLink>
        <UserButton />
      </Show>
    </>
  );
}

/** "Log out" link at the bottom of the dashboards' sidebar (only with Clerk). */
export function SidebarSignOut({ dark = false }: { dark?: boolean }) {
  const t = useTranslations("common.nav");
  if (!clerkEnabled) return null;
  return (
    <SignOutButton redirectUrl="/">
      <button
        type="button"
        className={cn("mb-3 w-full rounded-xl px-3.5 py-2.5 text-start text-sm font-medium", dark ? "text-ink-soft hover:bg-white/8 hover:text-white" : "text-navy hover:bg-beige")}
      >
        {t("logOut")}
      </button>
    </SignOutButton>
  );
}
