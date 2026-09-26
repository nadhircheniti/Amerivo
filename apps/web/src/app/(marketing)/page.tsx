import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow, PhotoPlaceholder, Tag } from "@/components/ui/primitives";
import { teachers, type Teacher } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { toneTile } from "./_components/tone";

const valueProps: { icon: IconName; title: string; body: [string, string]; tone: string }[] = [
  { icon: "user", title: "Expert Teachers", body: ["Qualified, native speakers", "from the U.S."], tone: "bg-teal-100 text-teal-dark" },
  { icon: "calendar", title: "Flexible Scheduling", body: ["Book lessons that fit your life,", "in your own time zone."], tone: "bg-orange-100 text-orange-dark" },
  { icon: "target", title: "Personalized Learning", body: ["A plan built on your level", "and your goals."], tone: "bg-sky-100 text-sky" },
  { icon: "globe", title: "Global Community", body: ["Learn, connect, grow —", "together."], tone: "bg-lilac-100 text-lilac" },
];

const steps = [
  { title: "Take the placement test", body: "Tell us your goals and get your CEFR level, from A1 to C2." },
  { title: "Get matched", body: "We recommend teachers by goal, availability, specialty and rating." },
  { title: "Book & pay securely", body: "Pick a time in your time zone. Card, Apple Pay, Google Pay or PayPal." },
  { title: "Learn live", body: "Join your video classroom in one click, then get notes and homework." },
];

const plans = [
  { title: "Trial lesson", price: "20 min", body: "Meet a teacher and discuss your goals before you book." },
  { title: "Single lesson", price: "$20–50", body: "One 50-minute live lesson at the teacher's rate." },
  { title: "5-lesson pack", price: "Up to 5% off", body: "Offered by participating teachers.", featured: true },
  { title: "10-lesson pack", price: "Up to 10% off", body: "Best value for steady progress." },
];

const featuredSlugs = ["sarah-mitchell", "james-robinson", "amanda-lee", "david-king"];
const featured = featuredSlugs.map((s) => teachers.find((t) => t.slug === s)).filter((t): t is Teacher => Boolean(t));

/** Two specialties shown on the home cards, as in the design. */
const cardTags = (t: Teacher) => (t.specialties.includes("Travel") ? ["Conversation", "Travel"] : t.specialties.slice(0, 2));

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* decorative blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-[60px] -left-[60px] size-[220px] rounded-full bg-yellow opacity-35" />
      <div aria-hidden="true" className="pointer-events-none absolute top-[270px] -left-[90px] h-[260px] w-[180px] rounded-full bg-teal opacity-25" />

      {/* HERO */}
      <section className="relative mx-auto flex max-w-[1440px] flex-col lg:min-h-[620px] lg:flex-row">
        <div className="relative z-[2] flex flex-col gap-[22px] px-6 pt-12 pb-10 lg:w-[640px] lg:shrink-0 lg:px-0 lg:pt-20 lg:pb-16 lg:pl-20">
          <Eyebrow className="text-sm tracking-[5px]">Online English Learning</Eyebrow>
          <h1 className="text-5xl leading-[1.02] font-extrabold tracking-[-1.5px] sm:text-6xl lg:text-[76px]">
            Learn English
            <br />
            Your Way
          </h1>
          <p className="font-serif text-2xl sm:text-[32px]">Flexible. Personalized. Global.</p>
          <p className="max-w-[480px] text-lg leading-relaxed text-navy-soft lg:text-[19px]">
            Live one-on-one lessons with vetted American English teachers. Build real conversations and reach your goals — from anywhere.
          </p>
          <form
            action="/teachers"
            method="get"
            role="search"
            className="mt-2 flex h-[68px] w-full max-w-[500px] items-center gap-3 rounded-full bg-white pr-2 pl-6 shadow-[0_10px_30px_rgb(15_59_91/0.10)] focus-within:ring-3 focus-within:ring-teal"
          >
            <Icon name="search" size={22} />
            <label htmlFor="hero-q" className="sr-only">
              What do you want to learn?
            </label>
            <input
              id="hero-q"
              name="q"
              placeholder="What do you want to learn? e.g. Business English"
              className="min-w-0 flex-1 bg-transparent text-base text-navy placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search teachers"
              className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-orange text-navy hover:bg-[#ffa64d]"
            >
              <Icon name="arrowRight" size={22} strokeWidth={2} />
            </button>
          </form>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-navy-soft">
            {["Free placement test", "20-min trial lessons", "U.S. teachers only"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Icon name="check" size={18} strokeWidth={2.2} className="text-teal-dark" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* photo area */}
        <div className="relative mx-6 h-[380px] overflow-hidden rounded-[32px] sm:h-[460px] lg:absolute lg:top-0 lg:right-0 lg:mx-0 lg:h-[620px] lg:w-[min(820px,57vw)] lg:rounded-none lg:rounded-l-[420px]">
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-[#f3d9a8] via-[#e9b87a] to-[#c98c58]" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 bottom-0 left-[17%] flex h-[58%] items-end gap-2.5 opacity-55"
          >
            {[220, 300, 180, 360, 240, 280, 160, 320, 200].map((h, i) => (
              <div
                key={i}
                className={cn("flex-1", i % 3 === 1 ? "bg-[#6b4430]" : i % 4 === 3 ? "bg-[#5c3a28]" : "bg-[#7a4e34]")}
                style={{ height: `${(h / 360) * 100}%` }}
              />
            ))}
          </div>
          <PhotoPlaceholder label="New York skyline at golden hour" className="absolute inset-0 bg-transparent!" />
          <p className="absolute top-10 right-10 -rotate-12 font-hand text-4xl leading-[1.05] text-navy sm:top-[70px] sm:right-[90px] sm:text-[46px]">
            Better
            <br />
            English
            <br />
            Bigger
            <br />
            Opportunities
            <span aria-hidden="true" className="mt-1.5 block h-1 w-[150px] rounded bg-orange" />
          </p>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section aria-label="Why Amerivo" className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-6 pt-12 pb-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-20">
        {valueProps.map((v, i) => (
          <div
            key={v.title}
            className={cn("flex flex-col items-center gap-3 px-6 text-center", i < 3 && "lg:border-r lg:border-line")}
          >
            <div className={cn("flex size-20 items-center justify-center rounded-full", v.tone)}>
              <Icon name={v.icon} size={34} strokeWidth={1.7} />
            </div>
            <h3 className="text-xl font-bold">{v.title}</h3>
            <p className="text-base leading-normal text-navy-soft">
              {v.body[0]}
              <br />
              {v.body[1]}
            </p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-4 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-6 py-16 lg:px-20 lg:py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-[-0.8px] sm:text-[44px] sm:leading-tight">From first test to fluent conversations</h2>
          </div>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-3.5 rounded-3xl bg-beige p-8">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full font-display font-bold",
                    i === steps.length - 1 ? "bg-orange text-navy" : "bg-navy text-white",
                  )}
                >
                  {i + 1}
                </span>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-navy-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TEACHERS */}
      <section className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 py-16 lg:px-20 lg:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-3">
            <Eyebrow>Meet our teachers</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-[-0.8px] sm:text-[44px] sm:leading-tight">Real people. Real conversations.</h2>
          </div>
          <Link href="/teachers" className="flex items-center gap-2 text-base font-semibold text-teal-dark hover:text-navy">
            Browse all teachers <Icon name="arrowRight" size={18} strokeWidth={2} />
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/teachers/${t.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-3xl bg-white text-navy shadow-card transition-shadow hover:shadow-float"
              >
                <div className={cn("relative flex h-[220px] items-center justify-center", toneTile[t.tone])}>
                  <span aria-hidden="true" className="font-display text-[56px] font-bold">
                    {t.initials}
                  </span>
                  <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-navy">
                    <Icon name="play" size={14} />
                    Intro video
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-[22px]">
                  <div className="flex justify-between gap-2">
                    <h3 className="text-[19px] font-bold">{t.shortName}</h3>
                    <span className="text-[15px] font-semibold">
                      ${t.priceUsd}
                      <span className="font-normal text-muted"> /50 min</span>
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {t.city} · {t.yearsExperience} yrs experience
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {cardTags(t).map((s) => (
                      <Tag key={s}>{s}</Tag>
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
              <Eyebrow onDark>Simple pricing</Eyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.8px] text-white sm:text-[44px] sm:leading-tight">Pay per lesson or save with a package</h2>
            </div>
            <p className="max-w-[420px] text-[17px] leading-relaxed text-ink-soft">
              Each teacher sets their own rate, from $20 to $50 per 50-minute session. Cancel for a full refund up to 24 hours before.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <li
                key={p.title}
                className={cn(
                  "relative flex flex-col gap-3.5 rounded-3xl p-8",
                  p.featured ? "bg-white text-navy" : "border border-white/14 bg-white/6",
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3.5 left-8 rounded-full bg-orange px-3 py-1.5 text-xs font-bold tracking-[1px] text-navy">POPULAR</span>
                )}
                <h3 className={cn("text-xl font-bold", !p.featured && "text-white")}>{p.title}</h3>
                <p className="font-display text-[34px] font-bold">{p.price}</p>
                <p className={cn("text-[15px] leading-normal", p.featured ? "text-navy-soft" : "text-ink-soft")}>{p.body}</p>
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
          <h2 className="text-[28px] font-extrabold lg:text-[32px]">English for your team</h2>
          <p className="text-[17px] leading-relaxed text-navy-soft">
            Tell us your company&apos;s language needs and book 10, 20 or more sessions for your employees.
          </p>
          <ButtonLink href="mailto:business@amerivo.example" variant="teal" className="self-start px-[26px]">
            Request a company plan
          </ButtonLink>
        </div>
        <div className="flex flex-col gap-[18px] rounded-[28px] bg-yellow p-8 lg:p-12">
          <div className="flex size-[60px] items-center justify-center rounded-[18px] bg-white text-navy">
            <Icon name="video" size={28} />
          </div>
          <h2 className="text-[28px] font-extrabold lg:text-[32px]">Teach American English</h2>
          <p className="text-[17px] leading-relaxed">
            Set your own rate, teach from anywhere and get paid monthly. Apply with a 2-minute intro video.
          </p>
          <ButtonLink href="/teach/apply" variant="navy" className="self-start px-[26px]">
            Become a Teacher
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
