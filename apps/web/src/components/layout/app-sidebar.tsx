"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { Avatar, type AvatarTone } from "@/components/ui/primitives";
import { SidebarSignOut } from "./auth-nav";
import { useMe } from "./role-gate";
import { fileSrc } from "@/components/ui/file-upload";
import { LanguageSwitcher } from "./language-switcher";
import { useUnreadMessages } from "@/components/messaging/message-alerts";
import { intlTags, type Locale } from "@/i18n/config";
import { useLocale, useTranslations } from "next-intl";

export type SidebarItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: { text: string; tone?: "orange" | "danger"; /** Read by screen readers instead of the bare number. */ label?: string };
  /** Live counter shown as the badge: "messages" = unread messages (inside <MessageAlerts>). */
  live?: "messages";
  exact?: boolean;
};

/**
 * Left navigation used by the three signed-in spaces.
 * - student: light sidebar
 * - teacher: navy sidebar
 * - admin:   light, compact sidebar
 */
export function AppSidebar({
  variant,
  items,
  user,
  footer,
}: {
  variant: "student" | "teacher" | "admin";
  items: SidebarItem[];
  user?: { name: string; subtitle: string; initials: string; tone: AvatarTone };
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const dark = variant === "teacher";
  // Signed in: show the real account (and its role) instead of the sample profile.
  const me = useMe();
  const t = useTranslations("common");
  const tm = useTranslations("messaging.view");
  const locale = useLocale() as Locale;
  const unread = useUnreadMessages();
  const badgeOf = (item: SidebarItem): SidebarItem["badge"] => {
    if (item.live === "messages") {
      const n = unread?.count ?? 0;
      return n > 0 ? { text: n > 99 ? "99+" : n.toLocaleString(intlTags[locale]), label: tm("unreadCount", { count: n }) } : undefined;
    }
    return item.badge;
  };
  if (me) {
    const name = `${me.firstName} ${me.lastName}`.trim() || me.email;
    const roleLabel = t(`roles.${me.role}`);
    user = {
      name,
      subtitle: me.role === variant ? roleLabel : t("sidebar.viewing", { role: roleLabel, space: t(`spaces.${variant}`) }),
      initials: `${me.firstName.charAt(0)}${me.lastName.charAt(0)}`.toUpperCase() || "A",
      tone: user?.tone ?? "teal",
    };
  }
  const isActive = (item: SidebarItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col gap-1.5 overflow-y-auto md:flex",
        variant === "admin" ? "w-[248px] px-4 py-[26px]" : "w-[264px] px-[18px] py-7",
        dark ? "bg-navy text-white" : "border-e border-sand bg-white",
      )}
    >
      <div className="px-2.5 pb-6">
        {variant === "student" && <Logo size="sm" subtitle="ENGLISH" />}
        {variant === "teacher" && <Logo size="sm" onDark subtitle="TEACHER" subtitleClassName="text-yellow tracking-[3px] font-semibold" href="/teacher" />}
        {variant === "admin" && <Logo size="sm" subtitle="ADMIN" subtitleClassName="text-teal-dark tracking-[3px] font-bold" href="/admin" />}
      </div>
      <nav aria-label={t("sidebar.nav")} className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item);
          const badge = badgeOf(item);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3",
                variant === "admin" ? "text-sm" : "text-[15px]",
                dark
                  ? active
                    ? "bg-white/14 font-semibold text-white"
                    : "text-ink-soft hover:bg-white/8 hover:text-white"
                  : variant === "admin"
                    ? active
                      ? "bg-navy font-semibold text-white"
                      : "text-navy hover:bg-beige-2"
                    : active
                      ? "bg-teal-100 font-semibold text-navy"
                      : "text-navy hover:bg-beige",
              )}
            >
              <Icon name={item.icon} size={variant === "admin" ? 18 : 20} />
              {item.label}
              {badge && (
                <span className={cn("ms-auto rounded-full px-2 py-0.5 text-xs font-bold", badge.tone === "danger" ? "bg-danger-100 text-danger-text" : "bg-orange text-navy")}>
                  {badge.label ? (
                    <>
                      <span aria-hidden="true">{badge.text}</span>
                      <span className="sr-only">{badge.label}</span>
                    </>
                  ) : (
                    badge.text
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        {footer}
        <LanguageSwitcher dark={dark} className="mb-2 px-3.5" />
        <SidebarSignOut dark={dark} />
        {user && (
          <div className={cn("flex items-center gap-3 rounded-2xl p-3.5", dark ? "bg-white/8" : "bg-beige")}>
            <Avatar initials={user.initials} tone={user.tone} size={42} src={fileSrc(me?.avatarUrl) ?? undefined} alt="" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{user.name}</span>
              <span className={cn("text-xs", dark ? "text-[#9fdccf]" : "text-muted")}>{user.subtitle}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
