import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, namespaces, negotiate, type Locale } from "./config";

/** Loads every namespace file of a language into one message object. */
async function loadMessages(locale: Locale) {
  const parts = await Promise.all(namespaces.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const));
  return Object.fromEntries(parts);
}

/**
 * Language = the visitor's choice (cookie), else the browser's language, else English.
 * No /fr, /ar… prefixes in the URLs: every page keeps its address in all languages.
 */
export default getRequestConfig(async () => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(chosen) ? chosen : negotiate((await headers()).get("accept-language")) || defaultLocale;
  const [messages, fallback] = await Promise.all([loadMessages(locale), locale === defaultLocale ? null : loadMessages(defaultLocale)]);
  return {
    locale,
    // A key missing in a translation falls back to the English text instead of breaking the page.
    messages: fallback ? deepMerge(fallback, messages) : messages,
    timeZone: "UTC",
  };
});

type Tree = { [k: string]: string | Tree };
function deepMerge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = typeof v === "object" && typeof base[k] === "object" ? deepMerge(base[k] as Tree, v) : v;
  return out;
}
