"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui/logo";
import { useTranslations } from "next-intl";
import { HeaderAuth } from "./auth-nav";
import { LanguageSwitcher } from "./language-switcher";

const nav = [
  { href: "/", key: "home", wide: false },
  { href: "/teachers", key: "teachers", wide: false },
  { href: "/#how-it-works", key: "howItWorks", wide: true },
  { href: "/#pricing", key: "pricing", wide: false },
  { href: "/#business", key: "business", wide: true },
  { href: "/teach/apply", key: "becomeTeacher", wide: false },
] as const;

export function SiteHeader({ translucent = false }: { translucent?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("common.nav");
  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <header className={cn("relative z-10 border-b border-sand", translucent ? "bg-white/70" : "bg-white")}>
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-20 2xl:gap-12">
        <Logo size="sm" className="sm:hidden" />
        <Logo size="md" className="hidden sm:flex" />
        <nav aria-label={t("main")} className="hidden flex-1 justify-center gap-5 text-sm font-medium whitespace-nowrap lg:flex 2xl:gap-8 2xl:text-[15px]">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn("pb-1.5 text-navy hover:text-teal-dark", item.wide && "hidden xl:inline", isActive(item.href) && "border-b-2 border-orange")}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-3 sm:gap-5 lg:ms-0">
          <LanguageSwitcher compact className="hidden sm:inline-flex" />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
