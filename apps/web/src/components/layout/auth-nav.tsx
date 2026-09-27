"use client";

import { Show, SignOutButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { clerkEnabled } from "@/lib/auth-config";

function GuestLinks() {
  return (
    <>
      <Link href="/login" className="font-medium text-navy hover:text-teal-dark">
        Log In
      </Link>
      <ButtonLink href="/signup" size="sm" className="px-6 font-semibold">
        Get Started
      </ButtonLink>
    </>
  );
}

/** Right side of the public header: guest links, or "My space" + account menu when signed in. */
export function HeaderAuth() {
  if (!clerkEnabled) return <GuestLinks />;
  return (
    <>
      <Show when="signed-out">
        <GuestLinks />
      </Show>
      <Show when="signed-in">
        <ButtonLink href="/welcome" size="sm" variant="teal" className="px-6 font-semibold">
          My space
        </ButtonLink>
        <UserButton />
      </Show>
    </>
  );
}

/** "Log out" link at the bottom of the dashboards' sidebar (only with Clerk). */
export function SidebarSignOut({ dark = false }: { dark?: boolean }) {
  if (!clerkEnabled) return null;
  return (
    <SignOutButton redirectUrl="/">
      <button
        type="button"
        className={cn("mb-3 w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium", dark ? "text-ink-soft hover:bg-white/8 hover:text-white" : "text-navy hover:bg-beige")}
      >
        Log out
      </button>
    </SignOutButton>
  );
}
