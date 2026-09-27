"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

/**
 * Notification bell of the student and teacher dashboards.
 * Placeholder: the messaging work turns it into the real in-app notification list (GET /notifications).
 */
export function NotificationBell() {
  const t = useTranslations("messaging.bell");
  return (
    <button
      type="button"
      aria-label={t("label")}
      className="relative inline-flex size-12 items-center justify-center rounded-full border border-sand bg-white text-navy hover:bg-beige"
    >
      <Icon name="bell" />
    </button>
  );
}
