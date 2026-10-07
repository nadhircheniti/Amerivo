import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import heroPhoto from "@/assets/hero-new-york.jpg";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company.about");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const SKILLS = ["everyday", "professional", "travel", "pronunciation", "listening", "vocabulary", "interviews", "goals"] as const;

/** Text blocks of the page, in reading order (content supplied by Amerivo). */
const BLOCKS: { id: string; icon: IconName; title: "builtTitle" | "communityTitle" | "teachersTitle" | "visionTitle"; paragraphs: ("built1" | "built2" | "community1" | "community2" | "teachers1" | "teachers2" | "teachers3" | "vision1" | "vision2")[]; motto?: "builtMotto" | "communityMotto" }[] = [
  { id: "built", icon: "target", title: "builtTitle", paragraphs: ["built1", "built2"], motto: "builtMotto" },
  { id: "community", icon: "globe", title: "communityTitle", paragraphs: ["community1", "community2"], motto: "communityMotto" },
  { id: "teachers", icon: "user", title: "teachersTitle", paragraphs: ["teachers1", "teachers2", "teachers3"] },
  { id: "vision", icon: "chart", title: "visionTitle", paragraphs: ["vision1", "vision2"] },
];

export default async function AboutPage() {
  const t = await getTranslations("company.about");
  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <Image src={heroPhoto} alt="" priority placeholder="blur" sizes="100vw" className="absolute inset-0 -z-10 size-full object-cover opacity-35" />
        <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-6 py-20 lg:py-28">
          <Eyebrow onDark className="rtl:tracking-normal">
            {t("eyebrow")}
          </Eyebrow>
          <h1 className="max-w-[820px] text-4xl leading-tight font-extrabold text-balance sm:text-[56px] rtl:leading-[1.3]">{t("title")}</h1>
          <p className="max-w-[720px] text-lg leading-relaxed text-white/90">{t("intro1")}</p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-14 px-6 py-16 lg:py-20">
        <section className="grid gap-6 text-lg leading-relaxed text-navy-soft md:grid-cols-2">
          <p>{t("intro2")}</p>
          <p>{t("intro3")}</p>
        </section>

        {/* MORE THAN LESSONS + skills */}
        <section aria-labelledby="more-title" className="flex flex-col gap-6 rounded-3xl bg-white p-6 sm:p-10">
          <h2 id="more-title" className="text-3xl font-extrabold">
            {t("moreTitle")}
          </h2>
          <p className="text-[17px] leading-relaxed text-navy-soft">{t("more1")}</p>
          <p className="text-[17px] leading-relaxed text-navy-soft">{t("more2")}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SKILLS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 rounded-2xl bg-beige px-4 py-3 text-[15px] font-semibold">
                <Icon name="check" size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-teal-dark" />
                {t(`skills.${s}`)}
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {BLOCKS.map((b) => (
            <section key={b.id} aria-labelledby={`${b.id}-title`} className="flex flex-col gap-4 rounded-3xl bg-white p-6 sm:p-8">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-dark">
                <Icon name={b.icon} size={24} />
              </span>
              <h2 id={`${b.id}-title`} className="text-2xl font-extrabold">
                {t(b.title)}
              </h2>
              {b.paragraphs.map((p) => (
                <p key={p} className="text-[16px] leading-relaxed text-navy-soft">
                  {t(p)}
                </p>
              ))}
              {b.motto && <p className="font-serif text-xl text-navy">{t(b.motto)}</p>}
            </section>
          ))}
        </div>

        {/* MISSION */}
        <section aria-labelledby="mission-title" className="flex flex-col gap-4 rounded-3xl bg-teal-dark p-8 text-white sm:p-12">
          <h2 id="mission-title" className="text-sm font-semibold tracking-[4px] text-white/80 uppercase rtl:tracking-normal">
            {t("missionTitle")}
          </h2>
          <p className="font-serif text-3xl leading-snug sm:text-4xl">{t("mission")}</p>
          <p className="max-w-[760px] text-[17px] leading-relaxed text-white/90">{t("mission2")}</p>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-title" className="flex flex-col items-center gap-5 py-6 text-center">
          <h2 id="cta-title" className="text-3xl font-extrabold sm:text-[40px]">
            {t("ctaTitle")}
          </h2>
          <p className="max-w-[680px] text-[17px] leading-relaxed text-navy-soft">{t("ctaText")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/teachers" variant="primary" size="lg">
              {t("ctaFind")}
            </ButtonLink>
            <ButtonLink href="/onboarding/goals" variant="outline" size="lg">
              {t("ctaTest")}
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
