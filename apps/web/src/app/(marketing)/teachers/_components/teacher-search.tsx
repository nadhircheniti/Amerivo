"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge, Divider, Rating, Tag } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { teachers, type Specialty, type Teacher } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { toneTile } from "../../_components/tone";

const specialtyOptions: { value: Specialty; label: string }[] = [
  { value: "Business English", label: "Business English" },
  { value: "Conversation", label: "Conversation" },
  { value: "Interview Prep", label: "Interview Preparation" },
  { value: "IELTS Prep", label: "IELTS Prep" },
  { value: "TOEFL Prep", label: "TOEFL Prep" },
  { value: "Teens", label: "Teens (13+)" },
];

type Audience = Teacher["teaches"][number];
const audiences: Audience[] = ["Adults", "Teens"];
const availabilityOptions = ["Morning", "Afternoon", "Evening", "Weekend"] as const;
const languageOptions = ["Spanish", "French", "Arabic", "Portuguese"] as const;

type Sort = "best" | "rating" | "price" | "experience";
const sortOptions: { value: Sort; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "rating", label: "Highest rated" },
  { value: "price", label: "Price: low to high" },
  { value: "experience", label: "Most experienced" },
];

const PRICE_MIN = 20;
const PRICE_MAX = 50;

/** Other spoken languages, e.g. "Spanish (B2)" -> "Spanish". */
const otherLanguages = (t: Teacher) => t.languages.filter((l) => !l.startsWith("English")).map((l) => l.replace(/\s*\(.*\)$/, ""));

/** If the hero search text names a specialty, pre-check it; otherwise keep it as a free-text filter. */
function parseQuery(q: string): { specialties: Specialty[]; text: string } {
  if (!q) return { specialties: ["Business English"], text: "" };
  const lower = q.toLowerCase();
  const hit = specialtyOptions.filter((o) => o.label.toLowerCase().includes(lower) || lower.includes(o.value.toLowerCase()));
  return hit.length ? { specialties: hit.map((h) => h.value), text: "" } : { specialties: [], text: q };
}

function matchesText(t: Teacher, text: string) {
  const hay = [t.name, t.headline, t.summary, t.city, ...t.specialties, ...t.languages].join(" ").toLowerCase();
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function TeacherSearch({ initialQuery }: { initialQuery: string }) {
  const initial = useMemo(() => parseQuery(initialQuery), [initialQuery]);
  const [specialties, setSpecialties] = useState<Specialty[]>(initial.specialties);
  const [text, setText] = useState(initial.text);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [availability, setAvailability] = useState<string[]>(["Morning"]);
  const [teaches, setTeaches] = useState<Audience[]>(["Adults"]);
  const [gender, setGender] = useState("any");
  const [language, setLanguage] = useState("any");
  const [sort, setSort] = useState<Sort>("best");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const ids = useId();

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const results = useMemo(() => {
    const list = teachers.filter(
      (t) =>
        (specialties.length === 0 || specialties.some((s) => t.specialties.includes(s))) &&
        t.priceUsd <= maxPrice &&
        (teaches.length === 0 || teaches.some((a) => t.teaches.includes(a))) &&
        (language === "any" || otherLanguages(t).includes(language)) &&
        (!text || matchesText(t, text)),
    );
    if (sort === "rating") return [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "price") return [...list].sort((a, b) => a.priceUsd - b.priceUsd);
    if (sort === "experience") return [...list].sort((a, b) => b.yearsExperience - a.yearsExperience);
    return list;
  }, [specialties, maxPrice, teaches, language, text, sort]);

  const resetFilters = () => {
    setSpecialties([]);
    setText("");
    setMaxPrice(PRICE_MAX);
    setAvailability([]);
    setTeaches([]);
    setGender("any");
    setLanguage("any");
  };

  const selectedLabels = specialtyOptions.filter((o) => specialties.includes(o.value)).map((o) => o.label);

  return (
    <>
      {/* Title row */}
      <div className="flex flex-col justify-between gap-5 px-6 pt-11 pb-7 md:flex-row md:items-end lg:px-20">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-3xl font-extrabold tracking-[-0.8px] sm:text-[40px] sm:leading-tight">Find your American English teacher</h1>
          <p className="text-[17px] text-navy-soft">All teachers are U.S. native speakers, verified and interviewed by our team.</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={`${ids}-sort`} className="shrink-0 text-sm text-muted">
            Sort by
          </label>
          <select
            id={`${ids}-sort`}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-[46px] rounded-xl border border-line bg-white px-4 text-[15px] text-navy focus:border-teal-dark focus:outline-none"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-8 px-6 lg:flex-row lg:items-start lg:px-20">
        {/* FILTERS */}
        <Button
          variant="outlineLight"
          size="sm"
          className="self-start lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls={`${ids}-filters`}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Icon name="settings" size={18} />
          {filtersOpen ? "Hide filters" : "Show filters"}
        </Button>
        <aside
          id={`${ids}-filters`}
          aria-label="Filters"
          className={cn("w-full shrink-0 flex-col gap-[26px] rounded-[20px] bg-white p-7 lg:flex lg:w-[300px]", filtersOpen ? "flex" : "hidden")}
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-[15px] font-bold">I want to learn</legend>
            {specialtyOptions.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2.5 text-[15px]">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={specialties.includes(o.value)}
                  onChange={() => setSpecialties((s) => toggle(s, o.value))}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
          <Divider />
          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <label htmlFor={`${ids}-price`} className="font-display text-[15px] font-bold">
                Price per lesson
              </label>
              <span className="text-sm text-muted" aria-hidden="true">
                ${PRICE_MIN} – ${maxPrice}
              </span>
            </div>
            <input
              id={`${ids}-price`}
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={1}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-valuetext={`Up to $${maxPrice}`}
              className="w-full"
            />
          </div>
          <Divider />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-[15px] font-bold">
              Availability <span className="font-sans text-[13px] font-medium text-muted">(your time)</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {availabilityOptions.map((a) => {
                const on = availability.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAvailability((s) => toggle(s, a))}
                    className={cn("h-11 rounded-xl border text-sm text-navy", on ? "border-teal-dark bg-teal-100" : "border-line bg-white hover:bg-beige")}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Divider />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-[15px] font-bold">Teaches</legend>
            {audiences.map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="checkbox" className="size-4" checked={teaches.includes(a)} onChange={() => setTeaches((s) => toggle(s, a))} />
                {a}
              </label>
            ))}
          </fieldset>
          <Divider />
          <div className="flex flex-col gap-3">
            <label htmlFor={`${ids}-gender`} className="font-display text-[15px] font-bold">
              Teacher gender
            </label>
            <select
              id={`${ids}-gender`}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-[15px] text-navy focus:border-teal-dark focus:outline-none"
            >
              <option value="any">No preference</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
            <label htmlFor={`${ids}-lang`} className="mt-1.5 font-display text-[15px] font-bold">
              Also speaks
            </label>
            <select
              id={`${ids}-lang`}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-[15px] text-navy focus:border-teal-dark focus:outline-none"
            >
              <option value="any">Any language</option>
              {languageOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <Button variant="ghost" className="self-start text-sm" onClick={resetFilters}>
            Clear all filters
          </Button>
        </aside>

        {/* RESULTS */}
        <section aria-labelledby={`${ids}-results`} className="flex min-w-0 flex-1 flex-col gap-[18px]">
          <h2 id={`${ids}-results`} className="sr-only">
            Results
          </h2>
          <p className="text-[15px] text-muted" aria-live="polite">
            {results.length} {results.length === 1 ? "teacher" : "teachers"}
            {selectedLabels.length > 0 ? (
              <>
                {" "}
                for <strong className="text-navy">{selectedLabels.join(", ")}</strong>
              </>
            ) : null}{" "}
            · prices shown in USD per 50-min lesson
          </p>
          {text && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              Matching “<strong className="text-navy">{text}</strong>”
              <button type="button" onClick={() => setText("")} className="inline-flex items-center gap-1 font-semibold text-teal-dark hover:text-navy">
                <Icon name="x" size={14} /> Clear search
              </button>
            </p>
          )}

          {results.length === 0 ? (
            <div className="flex flex-col items-start gap-4 rounded-[20px] bg-white p-8">
              <h3 className="text-xl font-bold">No teachers match these filters</h3>
              <p className="text-[15px] text-navy-soft">Try a higher price limit or fewer specialties.</p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-[18px]">
              {results.map((t) => (
                <li key={t.slug}>
                  <TeacherCard t={t} />
                </li>
              ))}
            </ul>
          )}

          <nav aria-label="Pagination" className="mt-3 flex justify-center gap-2">
            <button type="button" disabled aria-label="Previous page" className="flex size-11 items-center justify-center rounded-xl border border-line bg-white text-navy disabled:opacity-40">
              <Icon name="chevronLeft" size={18} />
            </button>
            <button type="button" aria-current="page" className="size-11 rounded-xl bg-navy font-semibold text-white">
              1
            </button>
            <button type="button" disabled aria-label="Next page" className="flex size-11 items-center justify-center rounded-xl border border-line bg-white text-navy disabled:opacity-40">
              <Icon name="chevronRight" size={18} />
            </button>
          </nav>
        </section>
      </div>
    </>
  );
}

function TeacherCard({ t }: { t: Teacher }) {
  const langs = otherLanguages(t);
  const tags = [...t.specialties.slice(0, 2), t.teaches[0]];
  return (
    <article className="flex flex-col gap-6 rounded-[20px] bg-white p-6 sm:flex-row">
      <div className={cn("flex size-[132px] shrink-0 items-center justify-center rounded-[20px] font-display text-[40px] font-bold", toneTile[t.tone])} aria-hidden="true">
        {t.initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[21px] font-bold">
            <Link href={`/teachers/${t.slug}`} className="hover:text-teal-dark">
              {t.name}
            </Link>
          </h3>
          <Badge tone="success">Verified</Badge>
        </div>
        <p className="text-sm text-muted">
          {t.city} ({t.tzLabel}) · {t.yearsExperience} years{langs.length > 0 && ` · Speaks ${langs.join(", ")}`}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Rating value={t.rating} />
          <span className="text-muted">[N] reviews</span>
          <span className="text-muted">[N] lessons</span>
        </div>
        <p className="text-[15px] leading-normal text-navy-soft">{t.summary}</p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {tags.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-line-soft pt-5 sm:w-[200px] sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
        <p className="font-display text-[28px] font-bold">${t.priceUsd}</p>
        <p className="-mt-2 text-[13px] text-muted">per 50-min lesson</p>
        <ButtonLink href={`/teachers/${t.slug}`} variant="teal" size="sm" className="h-11 text-[15px]" aria-label={`Book lesson with ${t.name}`}>
          Book lesson
        </ButtonLink>
        {t.offersTrial && (
          <ButtonLink href={`/teachers/${t.slug}?type=trial`} variant="outline" size="sm" className="h-11 text-[15px]" aria-label={`Free 20-min trial with ${t.name}`}>
            Free 20-min trial
          </ButtonLink>
        )}
      </div>
    </article>
  );
}
