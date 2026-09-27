import type { AvatarTone } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";

/** Large initials tiles (teacher cards) — same pairings as the Avatar tones. */
export const toneTile: Record<AvatarTone, string> = {
  teal: "bg-teal-100 text-teal-dark",
  orange: "bg-orange-100 text-orange-dark",
  sky: "bg-sky-100 text-sky",
  lilac: "bg-lilac-100 text-lilac",
  yellow: "bg-yellow text-navy",
  sand: "bg-sand text-navy",
  navy: "bg-navy-soft text-white",
};

/** Formats a USD amount without trailing ".00" (e.g. $35, $166.25), in the visitor's language. */
export function shortUsd(n: number, locale: Locale = "en") {
  const digits = Number.isInteger(n) ? 0 : 2;
  return n.toLocaleString(intlTags[locale], { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Localizes a spoken-language entry such as "Spanish (B2)" or "English (native)".
 * `tr` returns the translated language name (or the input when unknown); CEFR levels stay as-is.
 */
export function localizeLanguage(entry: string, tr: (name: string) => string) {
  const m = entry.match(/^(.*?)\s*\((.*)\)$/);
  if (!m) return tr(entry);
  const [, name, level] = m;
  return `${tr(name)} (${level === "native" ? tr("native") : level})`;
}
