/** Languages of the platform. "zh" is Mandarin Chinese written in Simplified characters. */
export const locales = ["en", "es", "fr", "ar", "zh", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Cookie that stores the visitor's choice (set by the language switcher). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Name of each language written in that language (what the switcher shows). */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  ar: "العربية",
  zh: "中文（简体）",
  ru: "Русский",
};

/** BCP-47 tags for dates, numbers and currency. */
export const intlTags: Record<Locale, string> = { en: "en-US", es: "es-419", fr: "fr-FR", ar: "ar-u-nu-latn", zh: "zh-CN", ru: "ru-RU" };

export const isRtl = (l: Locale) => l === "ar";
export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (locales as readonly string[]).includes(v);

/** Message files: one JSON per area and language (messages/<locale>/<namespace>.json). */
export const namespaces = ["common", "marketing", "auth", "onboarding", "checkout", "student", "teacher", "apply", "admin", "classroom", "messaging"] as const;
export type Namespace = (typeof namespaces)[number];

/** Best supported language from an Accept-Language header. */
export function negotiate(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
