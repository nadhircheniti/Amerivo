"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fileSrc } from "@/components/ui/file-upload";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/form";
import { Avatar, Badge } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import { countryCodeOf } from "@/lib/countries";
import { useApi } from "@/lib/use-api";
import { LoadState, initialsOf, toneOf, useLoad } from "../../_components/use-load";
import { sampleDetail, sampleStudents, type StudentDetail, type StudentRow } from "../_data";
import { StudentDrawer } from "./student-drawer";

type Filter = "all" | "upcoming" | "past";

/** Country name in the reader's language (the API stores English names). */
export function useCountryName() {
  const locale = useLocale() as Locale;
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([intlTags[locale]], { type: "region" });
    } catch {
      names = null;
    }
    return (value: string | null) => {
      if (!value) return null;
      const code = countryCodeOf(value);
      return (code && names?.of(code)) || value;
    };
  }, [locale]);
}

/** Live mode: GET /teacher/students (+ detail on demand). */
export function LiveStudents() {
  const t = useTranslations("teacher.students");
  const { call } = useApi();
  const { data, failed, retry } = useLoad<StudentRow[]>("/teacher/students");
  const loadDetail = useCallback((id: string) => call<StudentDetail>(`/teacher/students/${encodeURIComponent(id)}`), [call]);
  if (!data) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-10">
        <LoadState failed={failed} onRetry={retry} title={t("title")} />
      </div>
    );
  }
  return <StudentsView rows={data} loadDetail={loadDetail} />;
}

const demoDetail = async (id: string) => sampleDetail(id);

/** Demo mode: sample students. */
export function DemoStudents() {
  return <StudentsView rows={sampleStudents} loadDetail={demoDetail} />;
}

function StudentsView({ rows, loadDetail }: { rows: StudentRow[]; loadDetail: (id: string) => Promise<StudentDetail> }) {
  const t = useTranslations("teacher.students");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const country = useCountryName();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const date = (iso: string | null, withTime = false) =>
    iso ? new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}), ...(API_URL ? {} : { timeZone: "UTC" }) }).format(new Date(iso)) : "—";

  const active = rows.filter((r) => r.upcoming > 0).length;
  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) => (filter === "all" || (filter === "upcoming" ? r.upcoming > 0 : r.upcoming === 0)) && (!q || `${r.firstName} ${r.lastName}`.toLowerCase().includes(q)),
  );
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("filterAll", { count: rows.length }) },
    { id: "upcoming", label: t("filterUpcoming", { count: active }) },
    { id: "past", label: t("filterPast", { count: rows.length - active }) },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("title")}</h1>
        <p className="text-[15px] text-muted">{t("subtitle", { active, total: rows.length })}</p>
      </header>

      <section aria-labelledby="students-list" className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:p-[26px]">
        <h2 id="students-list" className="sr-only">
          {t("listTitle")}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative sm:w-72">
            <span className="sr-only">{t("search")}</span>
            <Icon name="search" size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="h-11 ps-10 text-sm" />
          </label>
          <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn("h-9 rounded-full px-3.5 text-[13px]", filter === f.id ? "bg-navy text-white" : "border border-line bg-white text-navy hover:bg-beige")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-beige px-6 py-10 text-center">
            <Icon name="users" size={28} className="text-teal-dark" />
            <p className="font-semibold">{t("emptyTitle")}</p>
            <p className="max-w-md text-sm text-muted">{t("emptyText")}</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("noMatch")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-beige-2">
            {shown.map((r) => {
              const name = `${r.firstName} ${r.lastName}`.trim();
              return (
                <li key={r.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      opener.current = e.currentTarget;
                      setOpenId(r.id);
                    }}
                    className="flex min-w-0 grow items-center gap-3 rounded-xl text-start hover:bg-beige/60"
                    aria-haspopup="dialog"
                  >
                    <Avatar initials={initialsOf(r.firstName, r.lastName)} tone={toneOf(r.id)} size={44} src={fileSrc(r.avatarUrl)} />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {name}
                        {r.level && <Badge tone="info">{r.level}</Badge>}
                        {r.lessonsCompleted === 0 && <Badge tone="lilac">{t("new")}</Badge>}
                      </span>
                      <span className="text-[13px] text-muted">
                        {[country(r.country), t("lessonsDone", { count: r.lessonsCompleted }), r.packageRemaining ? t("packLeft", { count: r.packageRemaining }) : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 text-[13px] sm:justify-end">
                    <span>
                      <span className="text-muted">{t("next")} </span>
                      <span className={cn("font-semibold", r.nextLessonAt ? "text-teal-deep" : "text-muted")}>{r.nextLessonAt ? date(r.nextLessonAt, true) : t("none")}</span>
                    </span>
                    <span>
                      <span className="text-muted">{t("last")} </span>
                      <span className="font-semibold">{date(r.lastLessonAt)}</span>
                    </span>
                    <Link href={`/teacher/messages?student=${encodeURIComponent(r.id)}`} className="font-semibold text-teal-dark hover:text-navy">
                      {t.rich("message", { sr: (c) => <span className="sr-only">{c}</span>, name })}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <StudentDrawer
        id={openId}
        row={rows.find((r) => r.id === openId) ?? null}
        loadDetail={loadDetail}
        onClose={() => {
          setOpenId(null);
          opener.current?.focus();
        }}
      />
    </div>
  );
}
