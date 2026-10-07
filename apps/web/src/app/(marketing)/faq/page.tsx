import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company.faq");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Questions of each group, in display order (keys of company.faq.<group> in the messages). */
const GROUPS = {
  students: ["whatIs", "findTeacher", "chooseTeacher", "languages", "online", "duration", "price", "packages", "cancel", "teacherCancels", "message", "payments", "refund"],
  teachers: ["who", "become", "experience", "price", "paid", "schedule", "countries", "minimum", "otherPlatforms", "communicate"],
  lessons: ["how", "tryDifferent", "review", "protect", "record", "problem"],
  about: ["why", "international", "school", "employ", "contact"],
} as const;
type Group = keyof typeof GROUPS;
const ORDER = Object.keys(GROUPS) as Group[];

export default async function FaqPage() {
  const t = await getTranslations("company.faq");
  const q = (g: Group, k: string) => t(`${g}.${k}.q` as never);
  const a = (g: Group, k: string) => t(`${g}.${k}.a` as never);

  // Structured data for search engines (FAQPage).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ORDER.flatMap((g) => GROUPS[g].map((k) => ({ "@type": "Question", name: q(g, k), acceptedAnswer: { "@type": "Answer", text: a(g, k) } }))),
  };

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-10 px-6 py-14 lg:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="flex flex-col gap-3">
        <Eyebrow className="rtl:tracking-normal">{t("eyebrow")}</Eyebrow>
        <h1 className="text-4xl font-extrabold sm:text-[48px]">{t("title")}</h1>
        <p className="max-w-[720px] text-lg leading-relaxed text-navy-soft">{t("subtitle")}</p>
        <nav aria-label={t("title")} className="mt-2 flex flex-wrap gap-2">
          {ORDER.map((g) => (
            <a key={g} href={`#${g}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-beige">
              {t(`groups.${g}`)}
            </a>
          ))}
        </nav>
      </header>

      {ORDER.map((g) => (
        <section key={g} id={g} aria-labelledby={`${g}-title`} className="flex scroll-mt-6 flex-col gap-3">
          <h2 id={`${g}-title`} className="text-2xl font-extrabold">
            {t(`groups.${g}`)}
          </h2>
          <div className="flex flex-col gap-2.5">
            {GROUPS[g].map((k) => (
              <details key={k} className="group rounded-2xl bg-white px-5 py-4 open:shadow-[0_2px_10px_rgb(15_59_91/0.06)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-navy [&::-webkit-details-marker]:hidden">
                  {q(g, k)}
                  <Icon name="chevronDown" size={18} className="shrink-0 text-teal-dark transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-navy-soft">{a(g, k)}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col items-start gap-4 rounded-3xl bg-teal-100 p-8">
        <h2 className="text-2xl font-extrabold">{t("stillTitle")}</h2>
        <p className="max-w-[640px] text-[16px] leading-relaxed text-navy-soft">{t("stillText")}</p>
        <ButtonLink href="/contact" variant="teal">
          {t("contactUs")}
        </ButtonLink>
      </section>
    </div>
  );
}
