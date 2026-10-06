"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { AppSidebar, type SidebarItem } from "@/components/layout/app-sidebar";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { Badges } from "./live/types";

const POLL_MS = 60_000;

/** Admin sidebar with live badges: pending teacher applications, open disputes and open support messages (polled every minute). */
export function AdminSidebar({ items, footer }: { items: (SidebarItem & { key: string })[]; footer: ReactNode }) {
  const { call, isLoaded, isSignedIn } = useApi();
  const locale = useLocale() as Locale;
  const [badges, setBadges] = useState<Badges | null>(null);

  useEffect(() => {
    if (!API_URL || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    const load = () =>
      call<Badges>("/admin/badges")
        .then((b) => !cancelled && setBadges(b))
        .catch(() => undefined); // keep the last known counts (the server may be waking up)
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [call, isLoaded, isSignedIn]);

  const count = (n: number | undefined) => (n ? n.toLocaleString(intlTags[locale]) : null);
  const withBadges: SidebarItem[] = items.map(({ key, ...item }) => {
    const text = key === "teachers" ? count(badges?.pendingApplications) : key === "disputes" ? count(badges?.openDisputes) : key === "support" ? count(badges?.openSupport) : null;
    return text ? { ...item, badge: { text, tone: key === "disputes" ? "danger" : "orange" } } : item;
  });

  return <AppSidebar variant="admin" items={withBadges} footer={footer} />;
}
