import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/caveat/600.css";
// Arabic glyphs only (unicode-range): downloaded only when Arabic text is on screen.
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/600.css";
import "@fontsource/noto-sans-arabic/700.css";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA, enUS, frFR, ruRU, zhCN } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { CLERK_PUBLISHABLE_KEY, clerkEnabled } from "@/lib/auth-config";
import { isRtl, type Locale } from "@/i18n/config";

/**
 * Clerk's own screens used here are the account menu and "Manage account": send only those texts
 * (half the size of the full translation). English is Clerk's default, so nothing is sent for it.
 */
function clerkTexts(locale: Locale) {
  if (locale === "en") return undefined;
  const all = { fr: frFR, ar: arSA, zh: zhCN, ru: ruRU }[locale] as Record<string, unknown>;
  const used = (k: string) => ["locale", "userButton", "userProfile", "badge__primary", "badge__you", "unstable__errors"].includes(k) || k.startsWith("formField") || k.startsWith("formButton");
  return Object.fromEntries(Object.entries(all).filter(([k]) => used(k))) as typeof enUS;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.meta");
  return {
    title: { default: t("title"), template: "%s · Amerivo English" },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = (await getLocale()) as Locale;
  const page = (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className="h-full">
      <body className="min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
  // Without Clerk keys the site runs in demo mode (no provider, forms just navigate).
  return clerkEnabled ? (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!} signInUrl="/login" signUpUrl="/signup" localization={clerkTexts(locale)}>
      {page}
    </ClerkProvider>
  ) : (
    page
  );
}
