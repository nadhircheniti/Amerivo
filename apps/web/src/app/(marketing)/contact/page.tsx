import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { CONTACT_EMAIL, CONTACT_MAILTO, CONTACT_PHONE, CONTACT_TEL } from "@/lib/contact";
import { ContactForm } from "./contact-form";
import { TOPICS, type Topic } from "./topics";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.contact");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const t = await getTranslations("marketing.contact");
  const { topic } = await searchParams;
  const initialTopic = TOPICS.find((x) => x === topic) ?? ("general" satisfies Topic);

  return (
    <div className="bg-beige-2">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="font-display text-sm font-semibold tracking-[4px] text-teal-dark uppercase">{t("eyebrow")}</span>
            <h1 className="font-display text-[34px] leading-tight font-extrabold lg:text-[44px]">{t("title")}</h1>
            <p className="text-[17px] leading-relaxed text-navy-soft">{t("subtitle")}</p>
          </div>

          <a href={CONTACT_MAILTO} className="group flex items-center gap-4 rounded-[20px] bg-white p-5 transition hover:shadow-sm">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-teal-100 text-teal-dark">
              <Icon name="message" size={22} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-muted">{t("emailLabel")}</span>
              <span className="font-display text-base font-bold text-navy group-hover:text-teal-dark sm:text-lg" dir="ltr">
                {/* Line break allowed only after the @ on narrow screens. */}
                {CONTACT_EMAIL.split("@")[0]}@<wbr />
                {CONTACT_EMAIL.split("@")[1]}
              </span>
            </span>
          </a>

          <a href={CONTACT_TEL} className="group flex items-center gap-4 rounded-[20px] bg-white p-5 transition hover:shadow-sm">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-orange-100 text-orange-dark">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-muted">{t("phoneLabel")}</span>
              <span className="font-display text-base font-bold text-navy group-hover:text-teal-dark sm:text-lg" dir="ltr">
                {CONTACT_PHONE}
              </span>
            </span>
          </a>

          <ul className="flex flex-col gap-3 text-[15px] text-navy-soft">
            <li className="flex items-start gap-3">
              <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-teal-dark" />
              {t("responseTime")}
            </li>
            <li className="flex items-start gap-3">
              <Icon name="building" size={18} className="mt-0.5 shrink-0 text-teal-dark" />
              {t("businessHint")}
            </li>
            <li className="flex items-start gap-3">
              <Icon name="globe" size={18} className="mt-0.5 shrink-0 text-teal-dark" />
              {t("languagesHint")}
            </li>
          </ul>
        </div>

        <ContactForm initialTopic={initialTopic} />
      </div>
    </div>
  );
}
