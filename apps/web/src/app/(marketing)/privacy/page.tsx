import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { COMPANY, PRIVACY_UPDATED } from "@/lib/legal";
import { privacySections } from "./_content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company.privacy");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Privacy Policy (English, the governing language; the page chrome is translated). */
export default async function PrivacyPage() {
  const [t, tm, locale] = await Promise.all([getTranslations("company.privacy"), getTranslations("marketing"), getLocale()]);
  return (
    <LegalDocument
      title={t("title")}
      meta={`${COMPANY.legalName} · Last updated: ${PRIVACY_UPDATED}`}
      contentsLabel={tm("terms.contents")}
      sections={privacySections}
      notices={
        locale !== "en" && (
          <p role="note" className="rounded-2xl bg-teal-100 px-5 py-4 text-sm leading-relaxed text-teal-deep">
            {t("englishNotice")}
          </p>
        )
      }
    />
  );
}
