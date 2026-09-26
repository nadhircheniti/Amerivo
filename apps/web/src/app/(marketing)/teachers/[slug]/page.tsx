import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { StarRow } from "@/components/ui/primitives";
import { getTeacher, teachers } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { toneTile, tzLongName } from "../../_components/tone";
import { BookingCard } from "./_components/booking-card";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return teachers.map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = getTeacher(slug);
  if (!t) return {};
  return { title: `${t.name} — ${t.headline}`, description: t.summary };
}

const sectionLabel = "font-sans text-sm font-semibold tracking-[1px] text-muted uppercase";

export default async function TeacherProfilePage({ params }: Params) {
  const { slug } = await params;
  const t = getTeacher(slug);
  if (!t) notFound();

  const firstName = t.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-20">
      <nav aria-label="Breadcrumb" className="pt-6 text-sm text-muted">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/teachers" className="text-teal-dark hover:text-navy">
              Teachers
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{t.specialties[0]}</li>
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
                  ID verified
                </span>
              </div>
              <p className="text-base text-navy-soft">{t.headline}</p>
              <dl className="mt-1.5 flex flex-wrap gap-x-7 gap-y-4">
                <Stat
                  label="Average rating"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Icon name="star" size={20} className="text-orange" />
                      {t.rating.toFixed(1)}
                    </span>
                  }
                />
                <Stat label="Lessons completed" value="[N]" />
                <Stat label="Experience" value={`${t.yearsExperience} yrs`} />
                <Stat label={`${tzLongName[t.tzLabel] ?? t.timezone} (${t.tzLabel})`} value={t.city} />
              </dl>
            </div>
          </section>

          <section aria-label="Introduction video" className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-3xl bg-navy sm:h-[380px]">
            <div aria-hidden="true" className="absolute -top-20 -right-20 size-[280px] rounded-full bg-teal opacity-25" />
            <div aria-hidden="true" className="absolute -bottom-[100px] -left-[60px] size-[260px] rounded-full bg-orange opacity-25" />
            <button
              type="button"
              aria-label={`Play ${firstName}'s introduction video`}
              className="relative flex size-[88px] items-center justify-center rounded-full bg-orange text-navy hover:bg-[#ffa64d]"
            >
              <Icon name="play" size={34} />
            </button>
            <span className="absolute bottom-6 left-7 text-[15px] font-semibold text-white">Meet {firstName} · 2-min introduction</span>
            <span className="absolute right-7 bottom-6 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">2:00</span>
          </section>

          <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 sm:p-8">
            <h2 className="text-[22px] font-bold">About me</h2>
            <p className="text-base leading-[1.7] text-navy-soft">
              [Teacher bio] — Background, teaching experience and teaching style, written by the teacher during onboarding. {t.summary}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2.5">
                <h3 className={sectionLabel}>Specialties</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {t.specialties.map((s) => (
                    <li key={s} className="rounded-full bg-teal-100 px-3 py-1.5 text-[13px]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className={sectionLabel}>Teaches</h3>
                <p className="text-[15px]">{t.teaches.join(" · ")}</p>
                <h3 className={cn(sectionLabel, "mt-1.5")}>Languages</h3>
                <p className="text-[15px]">{t.languages.join(" · ")}</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className={sectionLabel}>Certifications</h3>
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
              <h2 className="text-[22px] font-bold">Student reviews</h2>
              <span className="text-[15px] text-muted">{t.rating.toFixed(1)} average · [N] reviews</span>
            </div>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <li key={i} className="flex flex-col gap-2.5 rounded-2xl bg-beige p-[22px]">
                  <StarRow count={5} />
                  <p className="text-[15px] leading-relaxed text-navy-soft">[Student review text — shown after a completed lesson]</p>
                  <p className="text-[13px] text-muted">Student name · Country · Date</p>
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
