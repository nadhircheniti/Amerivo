import type { Metadata } from "next";
import { FocusHeader } from "@/components/layout/focus-header";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/primitives";
import { getLocale, getTranslations } from "next-intl/server";
import { intlTags, type Locale } from "@/i18n/config";
import { formatUsd, PLATFORM_COMMISSION, teacherNet } from "@/lib/mock-data";
import { ApplyWizard } from "./_components/apply-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply.page");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const faqs = ["earn", "paid", "who", "equipment"] as const;

export default async function TeachApplyPage() {
  const t = await getTranslations("apply.page");
  const locale = (await getLocale()) as Locale;
  const whole = (n: number) => n.toLocaleString(intlTags[locale], { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const prices = { min: whole(20), max: whole(50), example: whole(35), net: formatUsd(teacherNet(35), locale), commission: PLATFORM_COMMISSION * 100 };

  return (
    <div className="min-h-dvh bg-beige">
      <FocusHeader brandSuffix={t("brandSuffix")} right={{ href: "/", label: t("saveExit") }} />

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-20 lg:py-11">
        <ApplyWizard />

        <section id="faq" aria-labelledby="faq-heading" className="mt-16 scroll-mt-8 lg:mt-20">
          <div className="mb-6 flex flex-col gap-2">
            <Eyebrow>{t("faqEyebrow")}</Eyebrow>
            <h2 id="faq-heading" className="text-[28px] font-extrabold">
              {t("faqTitle")}
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((f) => (
              <details key={f} className="group rounded-3xl bg-white p-6 open:shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                  {t(`faq.${f}.q`)}
                  <Icon name="chevronRight" size={20} className="shrink-0 text-teal-dark transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-navy-soft">{t(`faq.${f}.a`, prices)}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
