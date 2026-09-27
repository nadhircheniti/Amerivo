"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Badge, Divider, Rating, Tag } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Specialty, Teacher } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { localizeLanguage, shortUsd, toneTile } from "../../_components/tone";

type SpecialtyKey = "businessEnglish" | "conversation" | "interviewPrep" | "ieltsPrep" | "toeflPrep" | "teens";
/** `label` is the English label (also matched against the hero search text); translated labels come from marketing.search.specialties. */
const specialtyOptions: { value: Specialty; key: SpecialtyKey; label: string }[] = [
  { value: "Business English", key: "businessEnglish", label: "Business English" },
  { value: "Conversation", key: "conversation", label: "Conversation" },
  { value: "Interview Prep", key: "interviewPrep", label: "Interview Preparation" },
  { value: "IELTS Prep", key: "ieltsPrep", label: "IELTS Prep" },
  { value: "TOEFL Prep", key: "toeflPrep", label: "TOEFL Prep" },
  { value: "Teens", key: "teens", label: "Teens (13+)" },
];

type Audience = Teacher["teaches"][number];
const audiences: Audience[] = ["Adults", "Teens"];
const availabilityOptions = ["Morning", "Afternoon", "Evening", "Weekend"] as const;
const languageOptions = ["Spanish", "French", "Arabic", "Portuguese"] as const;

type Sort = "best" | "rating" | "price" | "experience";
const sortOptions: Sort[] = ["best", "rating", "price", "experience"];

const PRICE_MIN = 20;
const PRICE_MAX = 50;

/** Other spoken languages, e.g. "Spanish (B2)" -> "Spanish". */
const otherLanguages = (t: Teacher) => t.languages.filter((l) => !l.startsWith("English")).map((l) => l.replace(/\s*\(.*\)$/, ""));

/** If the hero search text names a specialty, pre-check it; otherwise keep it as a free-text filter. */
function parseQuery(q: string, localLabel: (key: SpecialtyKey) => string): { specialties: Specialty[]; text: string } {
  if (!q) return { specialties: ["Business English"], text: "" };
  const lower = q.toLowerCase();
  const hit = specialtyOptions.filter((o) => {
    const local = localLabel(o.key).toLowerCase();
    return o.label.toLowerCase().includes(lower) || lower.includes(o.value.toLowerCase()) || local.includes(lower) || lower.includes(local);
  });
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

export function TeacherSearch({ initialQuery, teachers }: { initialQuery: string; teachers: Teacher[] }) {
  const t = useTranslations("marketing.search");
  const ta = useTranslations("common.audiences");
  const tl = useLanguageName();
  const locale = useLocale();
  const specialtyLabel = (key: SpecialtyKey) => t(`specialties.${key}`);
  // Initial filters are derived once per query (the page remounts this component when the query changes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => parseQuery(initialQuery, specialtyLabel), [initialQuery]);
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
  }, [teachers, specialties, maxPrice, teaches, language, text, sort]);

  const resetFilters = () => {
    setSpecialties([]);
    setText("");
    setMaxPrice(PRICE_MAX);
    setAvailability([]);
    setTeaches([]);
    setGender("any");
    setLanguage("any");
  };

  const selectedLabels = specialtyOptions.filter((o) => specialties.includes(o.value)).map((o) => specialtyLabel(o.key));

  return (
    <>
      {/* Title row */}
      <div className="flex flex-col justify-between gap-5 px-6 pt-11 pb-7 md:flex-row md:items-end lg:px-20">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-3xl font-extrabold tracking-[-0.8px] text-balance break-words sm:text-[40px] sm:leading-tight rtl:tracking-normal">{t("title")}</h1>
          <p className="text-[17px] text-navy-soft">{t("subtitle")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label htmlFor={`${ids}-sort`} className="shrink-0 text-sm text-muted">
            {t("sortBy")}
          </label>
          <select
            id={`${ids}-sort`}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-[46px] rounded-xl border border-line bg-white px-4 text-[15px] text-navy focus:border-teal-dark focus:outline-none"
          >
            {sortOptions.map((o) => (
              <option key={o} value={o}>
                {t(`sort.${o}`)}
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
          {filtersOpen ? t("hideFilters") : t("showFilters")}
        </Button>
        <aside
          id={`${ids}-filters`}
          aria-label={t("filters")}
          className={cn("w-full shrink-0 flex-col gap-[26px] rounded-[20px] bg-white p-7 lg:flex lg:w-[300px]", filtersOpen ? "flex" : "hidden")}
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-[15px] font-bold">{t("wantToLearn")}</legend>
            {specialtyOptions.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="checkbox" className="size-4" checked={specialties.includes(o.value)} onChange={() => setSpecialties((s) => toggle(s, o.value))} />
                {specialtyLabel(o.key)}
              </label>
            ))}
          </fieldset>
          <Divider />
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-between gap-x-2">
              <label htmlFor={`${ids}-price`} className="font-display text-[15px] font-bold">
                {t("pricePerLesson")}
              </label>
              <span className="text-sm text-muted" aria-hidden="true">
                {t("priceRange", { min: shortUsd(PRICE_MIN, locale), max: shortUsd(maxPrice, locale) })}
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
              aria-valuetext={t("upTo", { price: shortUsd(maxPrice, locale) })}
              className="w-full"
            />
          </div>
          <Divider />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-[15px] font-bold">
              {t("availability")} <span className="font-sans text-[13px] font-medium text-muted">{t("yourTime")}</span>
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
                    className={cn("min-h-11 rounded-xl border px-2 py-1 text-sm text-navy", on ? "border-teal-dark bg-teal-100" : "border-line bg-white hover:bg-beige")}
                  >
                    {t(`slots.${a}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Divider />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-[15px] font-bold">{t("teaches")}</legend>
            {audiences.map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="checkbox" className="size-4" checked={teaches.includes(a)} onChange={() => setTeaches((s) => toggle(s, a))} />
                {ta(a)}
              </label>
            ))}
          </fieldset>
          <Divider />
          <div className="flex flex-col gap-3">
            <label htmlFor={`${ids}-gender`} className="font-display text-[15px] font-bold">
              {t("gender")}
            </label>
            <select
              id={`${ids}-gender`}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-[15px] text-navy focus:border-teal-dark focus:outline-none"
            >
              <option value="any">{t("genderAny")}</option>
              <option value="female">{t("genderFemale")}</option>
              <option value="male">{t("genderMale")}</option>
            </select>
            <label htmlFor={`${ids}-lang`} className="mt-1.5 font-display text-[15px] font-bold">
              {t("alsoSpeaks")}
            </label>
            <select
              id={`${ids}-lang`}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-[15px] text-navy focus:border-teal-dark focus:outline-none"
            >
              <option value="any">{t("anyLanguage")}</option>
              {languageOptions.map((l) => (
                <option key={l} value={l}>
                  {tl(l)}
                </option>
              ))}
            </select>
          </div>
          <Button variant="ghost" className="self-start text-sm" onClick={resetFilters}>
            {t("clearFilters")}
          </Button>
        </aside>

        {/* RESULTS */}
        <section aria-labelledby={`${ids}-results`} className="flex min-w-0 flex-1 flex-col gap-[18px]">
          <h2 id={`${ids}-results`} className="sr-only">
            {t("results")}
          </h2>
          <p className="text-[15px] text-muted" aria-live="polite">
            {selectedLabels.length > 0
              ? t.rich("countFor", {
                  count: results.length,
                  specialties: selectedLabels.join(t("listSeparator")),
                  strong: (c) => <strong className="text-navy">{c}</strong>,
                })
              : t("count", { count: results.length })}{" "}
            · {t("pricesNote")}
          </p>
          {text && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{t.rich("matching", { text, strong: (c) => <strong className="text-navy">{c}</strong> })}</span>
              <button type="button" onClick={() => setText("")} className="inline-flex items-center gap-1 font-semibold text-teal-dark hover:text-navy">
                <Icon name="x" size={14} /> {t("clearSearch")}
              </button>
            </p>
          )}

          {results.length === 0 ? (
            <div className="flex flex-col items-start gap-4 rounded-[20px] bg-white p-8">
              <h3 className="text-xl font-bold">{t("emptyTitle")}</h3>
              <p className="text-[15px] text-navy-soft">{t("emptyBody")}</p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t("clearFilters")}
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

          <nav aria-label={t("pagination")} className="mt-3 flex justify-center gap-2">
            <button
              type="button"
              disabled
              aria-label={t("previousPage")}
              className="flex size-11 items-center justify-center rounded-xl border border-line bg-white text-navy disabled:opacity-40"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <button type="button" aria-current="page" className="size-11 rounded-xl bg-navy font-semibold text-white">
              1
            </button>
            <button
              type="button"
              disabled
              aria-label={t("nextPage")}
              className="flex size-11 items-center justify-center rounded-xl border border-line bg-white text-navy disabled:opacity-40"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          </nav>
        </section>
      </div>
    </>
  );
}

function TeacherCard({ t: teacher }: { t: Teacher }) {
  const t = useTranslations("marketing.search");
  const ts = useTranslations("common.specialties");
  const ta = useTranslations("common.audiences");
  const tl = useLanguageName();
  const locale = useLocale();
  const langs = otherLanguages(teacher).map(tl);
  const tags = [...teacher.specialties.slice(0, 2).map((s) => (ts.has(s as never) ? ts(s as never) : s)), ta.has(teacher.teaches[0]) ? ta(teacher.teaches[0]) : teacher.teaches[0]];
  const meta = [
    t("cardMeta", { city: teacher.city, tz: teacher.tzLabel, years: teacher.yearsExperience }),
    ...(langs.length > 0 ? [t("speaks", { languages: langs.join(t("listSeparator")) })] : []),
  ];
  return (
    <article className="flex flex-col gap-6 rounded-[20px] bg-white p-6 sm:flex-row">
      <div className={cn("flex size-[132px] shrink-0 items-center justify-center rounded-[20px] font-display text-[40px] font-bold", toneTile[teacher.tone])} aria-hidden="true">
        {teacher.initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[21px] font-bold">
            <Link href={`/teachers/${teacher.slug}`} className="hover:text-teal-dark">
              {teacher.name}
            </Link>
          </h3>
          <Badge tone="success">{t("verified")}</Badge>
        </div>
        <p className="text-sm text-muted">{meta.join(" · ")}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Rating value={teacher.rating} />
          <span className="text-muted">{t("reviewsPlaceholder")}</span>
          <span className="text-muted">{t("lessonsPlaceholder")}</span>
        </div>
        <p className="text-[15px] leading-normal text-navy-soft">{teacher.summary}</p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {tags.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-line-soft pt-5 sm:w-[200px] sm:border-t-0 sm:border-s sm:ps-6 sm:pt-0">
        <p className="font-display text-[28px] font-bold">{shortUsd(teacher.priceUsd, locale)}</p>
        <p className="-mt-2 text-[13px] text-muted">{t("perLesson")}</p>
        <ButtonLink
          href={`/teachers/${teacher.slug}`}
          variant="teal"
          size="sm"
          className="h-auto min-h-11 py-2 text-center text-[15px] leading-tight"
          aria-label={t("bookLessonWith", { name: teacher.name })}
        >
          {t("bookLesson")}
        </ButtonLink>
        {teacher.offersTrial && (
          <ButtonLink
            href={`/teachers/${teacher.slug}?type=trial`}
            variant="outline"
            size="sm"
            className="h-auto min-h-11 py-2 text-center text-[15px] leading-tight"
            aria-label={t("freeTrialWith", { name: teacher.name })}
          >
            {t("freeTrial")}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}

/** Translates a spoken-language entry ("Spanish", "Spanish (B2)", "English (native)"); unknown names stay as-is. */
function useLanguageName() {
  const tl = useTranslations("marketing.languages");
  return (entry: string) => localizeLanguage(entry, (n) => (tl.has(n as never) ? tl(n as never) : n));
}
