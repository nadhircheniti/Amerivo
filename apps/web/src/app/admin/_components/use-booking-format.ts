"use client";

import { useLocale, useTranslations } from "next-intl";
import { intlTags } from "@/i18n/config";
import type { BookingType } from "../_data";

/** Locale-aware labels for admin bookings: "Oct 14 · 16:00" (UTC) and lesson type names. */
export function useBookingFormat() {
  const t = useTranslations("admin.bookings.type");
  const locale = useLocale();
  const day = new Intl.DateTimeFormat(intlTags[locale], { month: "short", day: "numeric", timeZone: "UTC" });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${day.format(d)} · ${d.toISOString().slice(11, 16)}`;
  };

  const typeLabel = (type: BookingType) => {
    switch (type.kind) {
      case "single":
        return t("single");
      case "trial":
        return t("trial");
      case "pack":
        return t("pack", { size: type.size, used: type.used });
      case "corporate":
        return t("corporate", { size: type.size });
    }
  };

  return { formatDate, typeLabel };
}
