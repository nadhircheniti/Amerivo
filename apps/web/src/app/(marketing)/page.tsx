import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, Tag } from "@/components/ui/primitives";
import heroPhoto from "@/assets/hero-new-york.jpg";
import type { Teacher } from "@/lib/mock-data";
import { getFeaturedTeachers } from "@/lib/teachers";
import { cn } from "@/lib/cn";
import { shortUsd, toneTile } from "./_components/tone";

const valueProps: { id: "teachers" | "scheduling" | "personalized" | "community"; icon: IconName; tone: string }[] = [
  { id: "teachers", icon: "user", tone: "bg-teal-100 text-teal-dark" },
  { id: "scheduling", icon: "calendar", tone: "bg-orange-100 text-orange-dark" },
  { id: "personalized", icon: "target", tone: "bg-sky-100 text-sky" },
  { id: "community", icon: "globe", tone: "bg-lilac-100 text-lilac" },
];

const steps = ["test", "match", "book", "learn"] as const;

const plans: { id: "trial" | "single" | "pack5" | "pack10"; featured?: boolean }[] = [{ id: "trial" }, { id: "single" }, { id: "pack5", featured: true }, { id: "pack10" }];

const perks = ["placementTest", "trialLessons", "usTeachers"] as const;

const br = () => <br />;

/** Two specialties shown on the home cards, as in the design. */
const cardTags = (t: Teacher) => (t.specialties.includes("Travel") ? ["Conversation", "Travel"] : t.specialties.slice(0, 2));

export default async function HomePage() {
  const [t, tp, ts, locale] = await Promise.all([getTranslations("marketing.home"), getTranslations("marketing.profile"), getTranslations("common.specialties"), getLocale()]);
  // Chosen by the API (complete profiles first) so newly approved teachers show up here.
  const featured = await getFeaturedTeachers(4, { headline: tp("fallbackHeadline"), city: tp("fallbackCity") });
  const specialty = (s: string) => (ts.has(s as never) ? ts(s as never) : s);

  return (
    <div className="relative overflow-hidden">
      {/* decorative blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute -start-[60px] -top-[60px] size-[220px] rounded-full bg-yellow opacity-35" />
      <div aria-hidden="true" className="pointer-events-none absolute -start-[90px] top-[270px] h-[260px] w-[180px] rounded-full bg-teal opacity-25" />

      {/* HERO */}
      <section className="relative mx-auto flex max-w-[1440px] flex-col lg:min-h-[620px] lg:flex-row">
        <div className="relative z-[2] flex flex-col gap-[22px] px-6 pt-12 pb-10 lg:w-[640px] lg:shrink-0 lg:px-0 lg:ps-20 lg:pt-20 lg:pb-16">
          <Eyebrow className="text-sm tracking-[5px] rtl:tracking-normal">{t("eyebrow")}</Eyebrow>
          <h1 className="text-5xl leading-[1.02] font-extrabold tracking-[-1.5px] break-words hyphens-auto sm:text-6xl lg:text-[76px] rtl:leading-[1.25] rtl:tracking-normal">
            {t.rich("title", { br })}
          </h1>
          <p className="font-serif text-2xl sm:text-[32px]">{t("tagline")}</p>
          <p className="max-w-[480px] text-lg leading-relaxed text-navy-soft lg:text-[19px]">{t("intro")}</p>
          <form
            action="/teachers"
            method="get"
            role="search"
            className="mt-2 flex h-[68px] w-full max-w-[500px] items-center gap-3 rounded-full bg-white ps-6 pe-2 shadow-[0_10px_30px_rgb(15_59_91/0.10)] focus-within:ring-3 focus-within:ring-teal"
          >
            <Icon name="search" size={22} />
            <label htmlFor="hero-q" className="sr-only">
              {t("searchLabel")}
            </label>
            <input
              id="hero-q"
              name="q"
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-base text-navy placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t("searchSubmit")}
              className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-orange text-navy hover:bg-[#ffa64d]"
            >
              <Icon name="arrowRight" size={22} strokeWidth={2} />
            </button>
          </form>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-navy-soft">
            {perks.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Icon name="check" size={18} strokeWidth={2.2} className="text-teal-dark" />
                {t(`perks.${item}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* photo area */}
        <div className="relative mx-6 h-[380px] overflow-hidden rounded-[32px] sm:h-[460px] lg:absolute lg:end-0 lg:top-0 lg:mx-0 lg:h-[620px] lg:w-[min(820px,57vw)] lg:rounded-none lg:rounded-s-[420px]">
          <Image
            src={heroPhoto}
            alt={t("photoLabel")}
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) min(820px, 57vw), 100vw"
            className="absolute inset-0 size-full object-cover object-[60%_center]"
          />
          {/* Lightens the sky behind the handwritten line so it stays readable. */}
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgb(250_240_220/0.85),rgb(250_240_220/0.35)_40%,transparent_65%)]" />
          <p className="absolute end-10 top-10 max-w-[calc(100%-5rem)] -rotate-12 font-hand text-4xl leading-[1.05] break-words text-navy sm:end-[90px] sm:top-[70px] sm:text-[46px] rtl:rotate-12">
            {t.rich("handwritten", { br })}
            <span aria-hidden="true" className="mt-1.5 block h-1 w-[150px] rounded bg-orange" />
          </p>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section aria-label={t("whyLabel")} className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-6 pt-12 pb-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-20">
        {valueProps.map((v, i) => (
          <div key={v.id} className={cn("flex flex-col items-center gap-3 px-6 text-center", i < 3 && "lg:border-e lg:border-line")}>
            <div className={cn("flex size-20 items-center justify-center rounded-full", v.tone)}>
              <Icon name={v.icon} size={34} strokeWidth={1.7} />
            </div>
            <h3 className="text-xl font-bold">{t(`values.${v.id}.title`)}</h3>
            <p className="text-base leading-normal text-navy-soft">{t.rich(`values.${v.id}.body`, { br })}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-4 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-6 py-16 lg:px-20 lg:py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <Eyebrow className="rtl:tracking-normal">{t("how.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-[-0.8px] text-balance break-words sm:text-[44px] sm:leading-tight rtl:tracking-normal">{t("how.title")}</h2>
          </div>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-col gap-3.5 rounded-3xl bg-beige p-8">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full font-display font-bold",
                    i === steps.length - 1 ? "bg-orange text-navy" : "bg-navy text-white",
                  )}
                >
                  {i + 1}
                </span>
                <h3 className="text-xl font-bold">{t(`how.steps.${s}.title`)}</h3>
                <p className="text-[15px] leading-relaxed text-navy-soft">{t(`how.steps.${s}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TEACHERS */}
      <section className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 py-16 lg:px-20 lg:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-3">
            <Eyebrow className="rtl:tracking-normal">{t("teachers.eyebrow")}</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-[-0.8px] text-balance break-words sm:text-[44px] sm:leading-tight rtl:tracking-normal">{t("teachers.title")}</h2>
          </div>
          <Link href="/teachers" className="flex shrink-0 items-center gap-2 text-base font-semibold text-teal-dark hover:text-navy">
            {t("teachers.browseAll")} <Icon name="arrowRight" size={18} strokeWidth={2} />
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((tc) => (
            <li key={tc.slug}>
              <Link href={`/teachers/${tc.slug}`} className="flex h-full flex-col overflow-hidden rounded-3xl bg-white text-navy shadow-card transition-shadow hover:shadow-float">
                <div className={cn("relative flex h-[220px] items-center justify-center overflow-hidden", toneTile[tc.tone])}>
                  {tc.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- photos come from the API origin
                    <img src={tc.photoUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="font-display text-[56px] font-bold">
                      {tc.initials}
                    </span>
                  )}
                  {tc.videoEmbedUrl && (
                    <span className="absolute start-4 bottom-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-navy">
                      <Icon name="play" size={14} />
                      {t("teachers.introVideo")}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-[22px]">
                  <div className="flex justify-between gap-2">
                    <h3 className="text-[19px] font-bold">{tc.shortName}</h3>
                    <span className="shrink-0 text-[15px] font-semibold">
                      {shortUsd(tc.priceUsd, locale)}
                      <span className="font-normal text-muted"> {t("teachers.perLesson")}</span>
                    </span>
                  </div>
                  <p className="text-sm text-muted">{t("teachers.meta", { city: tc.city, years: tc.yearsExperience })}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {cardTags(tc).map((s) => (
                      <Tag key={s}>{specialty(s)}</Tag>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-4 bg-navy text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-11 px-6 py-16 lg:px-20 lg:py-20">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end lg:gap-10">
            <div className="flex flex-col gap-3">
              <Eyebrow onDark className="rtl:tracking-normal">
                {t("pricing.eyebrow")}
              </Eyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.8px] text-balance break-words text-white sm:text-[44px] sm:leading-tight rtl:tracking-normal">{t("pricing.title")}</h2>
            </div>
            <p className="max-w-[420px] text-[17px] leading-relaxed text-ink-soft">{t("pricing.intro")}</p>
          </div>
          <ul className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <li key={p.id} className={cn("relative flex flex-col gap-3.5 rounded-3xl p-8", p.featured ? "bg-white text-navy" : "border border-white/14 bg-white/6")}>
                {p.featured && (
                  <span className="absolute start-8 -top-3.5 rounded-full bg-orange px-3 py-1.5 text-xs font-bold tracking-[1px] text-navy uppercase rtl:tracking-normal">
                    {t("pricing.popular")}
                  </span>
                )}
                <h3 className={cn("text-xl font-bold", !p.featured && "text-white")}>{t(`pricing.plans.${p.id}.title`)}</h3>
                <p className="font-display text-[34px] leading-tight font-bold break-words">{t(`pricing.plans.${p.id}.price`)}</p>
                <p className={cn("text-[15px] leading-normal", p.featured ? "text-navy-soft" : "text-ink-soft")}>{t(`pricing.plans.${p.id}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* BUSINESS + TEACH */}
      <section id="business" className="mx-auto grid max-w-[1440px] scroll-mt-4 grid-cols-1 gap-6 px-6 py-16 md:grid-cols-2 lg:px-20 lg:py-20">
        <div className="flex flex-col gap-[18px] rounded-[28px] bg-white p-8 lg:p-12">
          <div className="flex size-[60px] items-center justify-center rounded-[18px] bg-teal-100 text-teal-dark">
            <Icon name="building" size={28} />
          </div>
          <h2 className="text-[28px] font-extrabold lg:text-[32px]">{t("business.title")}</h2>
          <p className="text-[17px] leading-relaxed text-navy-soft">{t("business.body")}</p>
          <ButtonLink href="/contact?topic=business" variant="teal" className="h-auto min-h-12 self-start px-[26px] py-2 text-center">
            {t("business.cta")}
          </ButtonLink>
        </div>
        <div className="flex flex-col gap-[18px] rounded-[28px] bg-yellow p-8 lg:p-12">
          <div className="flex size-[60px] items-center justify-center rounded-[18px] bg-white text-navy">
            <Icon name="video" size={28} />
          </div>
          <h2 className="text-[28px] font-extrabold lg:text-[32px]">{t("teach.title")}</h2>
          <p className="text-[17px] leading-relaxed">{t("teach.body")}</p>
          <ButtonLink href="/teach/apply" variant="navy" className="h-auto min-h-12 self-start px-[26px] py-2 text-center">
            {t("teach.cta")}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
