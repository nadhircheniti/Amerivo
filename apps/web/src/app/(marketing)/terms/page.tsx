import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
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
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-12 lg:flex-row lg:items-start lg:px-20 lg:py-16">
      <nav aria-label={t("terms.contents")} className="rounded-3xl bg-white p-6 lg:sticky lg:top-6 lg:w-[300px] lg:shrink-0">
        <h2 className="mb-3 text-sm font-semibold tracking-[1px] text-muted uppercase rtl:tracking-normal">{t("terms.contents")}</h2>
        <ol className="flex flex-col gap-1.5 text-sm" dir="ltr">
          {termsSections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-navy-soft hover:text-teal-dark">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="flex min-w-0 flex-1 flex-col gap-8 rounded-3xl bg-white p-6 sm:p-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-extrabold sm:text-[40px]">{t("terms.title")}</h1>
          <p className="text-sm text-muted" dir="ltr">
            {COMPANY.legalName} · Effective date: {TERMS_EFFECTIVE}
          </p>
          {locale !== "en" && (
            <p role="note" className="rounded-2xl bg-teal-100 px-5 py-4 text-sm leading-relaxed text-teal-deep">
              {t("terms.englishNotice")}
            </p>
          )}
          <p className="rounded-2xl bg-cream px-5 py-4 text-sm leading-relaxed text-navy">
            {t.rich("terms.keyPoints", { b: (c) => <strong className="font-semibold">{c}</strong> })}
          </p>
        </header>

        <div lang="en" dir="ltr" className="flex flex-col gap-9 text-[15px] leading-[1.75] text-navy-soft">
          {termsSections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-6 flex-col gap-3">
              <h2 id={`${s.id}-title`} className="text-xl font-bold text-navy">
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
