"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { setLocale } from "@/i18n/actions";
import { locales, localeNames } from "@/i18n/config";
import { cn } from "@/lib/cn";

/** Language picker: saves the choice in a cookie and re-renders the page in that language. */
export function LanguageSwitcher({ className, dark = false, compact = false }: { className?: string; dark?: boolean; compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("common.language");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("relative inline-flex items-center gap-1.5 text-sm font-medium", dark ? "text-ink-soft" : "text-navy", pending && "opacity-60", className)}>
      <Icon name="globe" size={18} className="shrink-0" />
      <span className="sr-only">{t("label")}</span>
      {compact && (
        <span aria-hidden="true" className="pe-4 uppercase">
          {locale}
        </span>
      )}
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
        className={cn(
          "cursor-pointer appearance-none rounded-lg bg-transparent py-1.5 pe-5 ps-0.5 outline-offset-2",
          // Compact: the select sits invisibly over the language code (keyboard and screen readers still use it).
          compact && "absolute inset-0 opacity-0",
          dark ? "text-white [&>option]:text-navy" : "text-navy",
        )}
      >
        {locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute end-0" />
    </label>
  );
}
