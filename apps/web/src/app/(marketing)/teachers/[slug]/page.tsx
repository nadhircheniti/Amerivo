import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";
import { StarRow } from "@/components/ui/primitives";
import { ratingText } from "@/lib/mock-data";
import { getTeacherBySlug } from "@/lib/teachers";
import { cn } from "@/lib/cn";
import { localizeLanguage, toneTile } from "../../_components/tone";
import { BookingCard } from "./_components/booking-card";

type Params = { params: Promise<{ slug: string }> };

/** Profiles are rendered on demand and cached for a minute (teachers come from the API). */
export const revalidate = 60;

/** Translated texts for teachers who left their headline or city empty. */
async function fallbacks() {
  const tp = await getTranslations("marketing.profile");
  return { headline: tp("fallbackHeadline"), city: tp("fallbackCity") };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTeacherBySlug(slug, await fallbacks());
  if (!t) return {};
  return { title: `${t.name} — ${t.headline}`, description: t.summary };
}

const sectionLabel = "font-sans text-sm font-semibold tracking-[1px] text-muted uppercase rtl:tracking-normal";

export default async function TeacherProfilePage({ params }: Params) {
  const { slug } = await params;
  const [t, tr, ts, ta, tl, tc, tn] = await Promise.all([
    getTeacherBySlug(slug, await fallbacks()),
    getTranslations("marketing.profile"),
    getTranslations("common.specialties"),
    getTranslations("common.audiences"),
    getTranslations("marketing.languages"),
    getTranslations("common.rating"),
    getTranslations("common.nav"),
  ]);
  if (!t) notFound();

  const firstName = t.name.split(" ")[0];
  const specialty = (s: string) => (ts.has(s as never) ? ts(s as never) : s);
  const audience = (a: string) => (ta.has(a as never) ? ta(a as never) : a);
  const language = (l: string) => localizeLanguage(l, (n) => (tl.has(n as never) ? tl(n as never) : n));
  const tzName = tr.has(`timeZones.${t.tzLabel}` as never) ? tr(`timeZones.${t.tzLabel}` as never) : t.timezone;
  const rating = ratingText(t, tc("new"));

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-20">
      <nav aria-label={tr("breadcrumb")} className="pt-6 text-sm text-muted">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/teachers" className="text-teal-dark hover:text-navy">
              {tn("teachers")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{specialty(t.specialties[0])}</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{t.name}</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-8 pt-6 pb-16 lg:flex-row lg:items-start">
        {/* LEFT */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="flex flex-col gap-7 rounded-3xl bg-white p-6 sm:flex-row sm:p-8">
            <div
              aria-hidden="true"
              className={cn(
                "flex size-[120px] shrink-0 items-center justify-center rounded-full border-[6px] border-white font-display text-[40px] font-bold shadow-[0_0_0_2px_var(--color-teal)] sm:size-40 sm:text-[52px]",
                toneTile[t.tone],
              )}
            >
              {t.initials}
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t.name}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1.5 text-[13px] font-semibold text-teal-deep">
                  <Icon name="shieldCheck" size={14} strokeWidth={2} />
                  {tr("idVerified")}
                </span>
              </div>
              <p className="text-base text-navy-soft">{t.headline}</p>
              <dl className="mt-1.5 flex flex-wrap gap-x-7 gap-y-4">
                <Stat
                  label={tr("averageRating")}
                  value={
                    <span className="flex items-center gap-1.5">
                      <Icon name="star" size={20} className="text-orange" />
                      {rating}
                    </span>
                  }
                />
                <Stat label={tr("lessonsCompleted")} value={t.lessonsCompleted !== undefined ? String(t.lessonsCompleted) : "[N]"} />
                <Stat label={tr("experience")} value={tr("yearsShort", { count: t.yearsExperience })} />
                <Stat label={`${tzName} (${t.tzLabel})`} value={t.city} />
              </dl>
            </div>
          </section>

          <section aria-label={tr("videoSection")} className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-3xl bg-navy sm:h-[380px]">
            <div aria-hidden="true" className="absolute -end-20 -top-20 size-[280px] rounded-full bg-teal opacity-25" />
            <div aria-hidden="true" className="absolute -start-[60px] -bottom-[100px] size-[260px] rounded-full bg-orange opacity-25" />
            <button
              type="button"
              aria-label={tr("playVideo", { name: firstName })}
              className="relative flex size-[88px] items-center justify-center rounded-full bg-orange text-navy hover:bg-[#ffa64d]"
            >
              <Icon name="play" size={34} />
            </button>
            <span className="absolute start-7 end-24 bottom-6 text-[15px] font-semibold text-white">{tr("meet", { name: firstName })}</span>
            <span className="absolute end-7 bottom-6 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">2:00</span>
          </section>

          <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 sm:p-8">
            <h2 className="text-[22px] font-bold">{tr("aboutMe")}</h2>
            <p className="text-base leading-[1.7] text-navy-soft">
              {tr("bioPlaceholder")} {t.summary}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2.5">
                <h3 className={sectionLabel}>{tr("specialties")}</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {t.specialties.map((s) => (
                    <li key={s} className="rounded-full bg-teal-100 px-3 py-1.5 text-[13px]">
                      {specialty(s)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className={sectionLabel}>{tr("teaches")}</h3>
                <p className="text-[15px]">{t.teaches.map(audience).join(" · ")}</p>
                <h3 className={cn(sectionLabel, "mt-1.5")}>{tr("languages")}</h3>
                <p className="text-[15px]">{t.languages.map(language).join(" · ")}</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className={sectionLabel}>{tr("certifications")}</h3>
                <ul className="text-[15px] leading-relaxed">
                  {t.certifications.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-5 rounded-3xl bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[22px] font-bold">{tr("reviews")}</h2>
              <span className="text-[15px] text-muted">
                {t.reviewCount === 0
                  ? tr("noReviews")
                  : t.reviewCount === undefined
                    ? tr("reviewsSummaryUnknown", { rating })
                    : tr("reviewsSummary", { rating, count: t.reviewCount })}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <li key={i} className="flex flex-col gap-2.5 rounded-2xl bg-beige p-[22px]">
                  <StarRow count={5} />
                  <p className="text-[15px] leading-relaxed text-navy-soft">{tr("reviewPlaceholder")}</p>
                  <p className="text-[13px] text-muted">{tr("reviewMeta")}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* BOOKING CARD */}
        <BookingCard
          slug={t.slug}
          firstName={firstName}
          priceUsd={t.priceUsd}
          offersTrial={t.offersTrial}
          offersPack5={t.offersPack5}
          offersPack10={t.offersPack10}
          teacherTimezone={t.timezone}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="font-display text-[22px] font-bold">{value}</dd>
    </div>
  );
}
