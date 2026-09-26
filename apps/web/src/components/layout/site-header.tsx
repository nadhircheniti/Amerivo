"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Home" },
  { href: "/teachers", label: "Teachers" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#business", label: "For Business" },
  { href: "/teach/apply", label: "Become a Teacher" },
];

export function SiteHeader({ translucent = false }: { translucent?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <header className={cn("relative z-10 border-b border-sand", translucent ? "bg-white/70" : "bg-white")}>
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center gap-12 px-6 lg:px-20">
        <Logo size="md" />
        <nav aria-label="Main" className="hidden flex-1 justify-center gap-8 text-[15px] font-medium lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn("pb-1.5 text-navy hover:text-teal-dark", isActive(item.href) && "border-b-2 border-orange")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-5 lg:ml-0">
          <Link href="/login" className="font-medium text-navy hover:text-teal-dark">
            Log In
          </Link>
          <ButtonLink href="/signup" size="sm" className="px-6 font-semibold">
            Get Started
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
