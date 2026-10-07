import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { COMPANY, TERMS_EFFECTIVE } from "@/lib/legal";
import { termsSections } from "./_content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return { title: t("terms.metaTitle"), description: t("terms.metaDescription") };
}

/** Terms of Service. The legal text is in English (governing language); the page chrome is translated. */
export default async function TermsPage() {
  const [t, locale] = await Promise.all([getTranslations("marketing"), getLocale()]);
  return (
    <LegalDocument
      title={t("terms.title")}
      meta={`${COMPANY.legalName} · Effective date: ${TERMS_EFFECTIVE}`}
      contentsLabel={t("terms.contents")}
      sections={termsSections}
      notices={
        <>
          {locale !== "en" && (
            <p role="note" className="rounded-2xl bg-teal-100 px-5 py-4 text-sm leading-relaxed text-teal-deep">
              {t("terms.englishNotice")}
            </p>
          )}
          <p className="rounded-2xl bg-cream px-5 py-4 text-sm leading-relaxed text-navy">
            {t.rich("terms.keyPoints", { b: (c) => <strong className="font-semibold">{c}</strong> })}
          </p>
        </>
      }
    />
  );
}
