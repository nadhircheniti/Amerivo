"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, Badge, type BadgeTone } from "@/components/ui/primitives";
import { intlTags, isRtl } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/mock-data";
import type { Applicant, ApplicantStatus, Evaluation, Score } from "../_data";

type TabId = "all" | "pending" | "approved" | "rejected" | "suspended";

/** Badge tone per status; labels come from messages admin.teachers.status.* */
const STATUS_TONE: Record<ApplicantStatus, BadgeTone> = {
  pending: "warning",
  interview: "info",
  approved: "success",
  rejected: "danger",
  suspended: "neutral",
};

const inTab = (s: ApplicantStatus, tab: TabId) => tab === "all" || (tab === "pending" ? s === "pending" || s === "interview" : s === tab);

const EVAL_FIELDS: (keyof Evaluation)[] = ["fluency", "professionalism", "teaching", "camera", "internet"];

const SCORES: Score[] = [5, 4, 3, 2, 1];

const control = "h-10 rounded-[10px] border border-line bg-white px-2 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none";

export function TeacherManagement({ initial }: { initial: Applicant[] }) {
  const t = useTranslations("admin.teachers");
  const locale = useLocale();
  const dateFmt = new Intl.DateTimeFormat(intlTags[locale], { month: "short", day: "numeric", timeZone: "UTC" });
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<TabId>("pending");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? null);
  const [notice, setNotice] = useState("");
  const base = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const pendingCount = list.filter((a) => inTab(a.status, "pending")).length;
  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: t("tabs.all") },
    { id: "pending", label: t("tabs.pending", { count: pendingCount }) },
    { id: "approved", label: t("tabs.approved") },
    { id: "rejected", label: t("tabs.rejected") },
    { id: "suspended", label: t("tabs.suspended") },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((a) => inTab(a.status, tab) && (!q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)));
  }, [list, tab, query]);

  const selected = list.find((a) => a.id === selectedId) ?? null;

  const patch = (id: string, p: Partial<Applicant>) => setList((l) => l.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const setStatus = (a: Applicant, status: ApplicantStatus) => {
    patch(a.id, { status });
    setNotice(t(`notice.${status}`, { name: a.name }));
  };

  const changeTab = (id: TabId) => {
    setTab(id);
    const first = list.find((a) => inTab(a.status, id));
    if (first && !(selected && inTab(selected.status, id))) setSelectedId(first.id);
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    // In right-to-left layouts the visual order is mirrored, so ArrowLeft moves forward.
    const forward = (e.key === "ArrowRight") !== isRtl(locale);
    const i = tabs.findIndex((x) => x.id === tab);
    const next = tabs[(i + (forward ? 1 : tabs.length - 1)) % tabs.length].id;
    changeTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold sm:text-[28px]">{t("title")}</h1>
        <label className="flex h-11 w-full items-center gap-2.5 rounded-[10px] border border-line bg-white px-3.5 focus-within:border-teal-dark sm:w-[300px]">
          <Icon name="search" size={18} className="shrink-0 text-muted" />
          <span className="sr-only">{t("search")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-w-0 grow bg-transparent text-sm text-navy placeholder:text-muted outline-none"
          />
        </label>
      </header>

      <div role="tablist" aria-label={t("statusTabs")} className="flex gap-1.5 overflow-x-auto border-b border-sand" onKeyDown={onTabKey}>
        {tabs.map((x) => (
          <button
            key={x.id}
            ref={(el) => {
              tabRefs.current[x.id] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`${base}-panel`}
            tabIndex={tab === x.id ? 0 : -1}
            onClick={() => changeTab(x.id)}
            className={cn(
              "h-11 shrink-0 border-b-[3px] px-4 text-sm whitespace-nowrap",
              tab === x.id ? "border-teal-dark font-bold text-navy" : "border-transparent text-muted hover:text-navy",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className={cn("rounded-xl bg-teal-100 px-4 py-2.5 text-sm text-teal-deep", !notice && "sr-only")}>
        {notice}
      </p>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab}`} className="flex flex-col gap-5 lg:flex-row">
        {/* Applicant list */}
        <section aria-label={t("applicants")} className="flex w-full shrink-0 flex-col gap-2.5 lg:w-80">
          {visible.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-muted">{t("empty")}</p>}
          <ul className="flex flex-col gap-2.5">
            {visible.map((a) => {
              const active = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-[14px] text-start",
                      active ? "border-teal-dark" : "border-transparent hover:border-line",
                    )}
                  >
                    <Avatar initials={a.initials} tone={a.tone} size={46} />
                    <span className="min-w-0 grow">
                      <span className="block font-semibold">{a.name}</span>
                      <span className="block text-[13px] text-muted">
                        {t(a.status === "pending" || a.status === "interview" ? "applied" : "since", {
                          city: a.city,
                          date: dateFmt.format(new Date(a.applied)),
                        })}
                      </span>
                    </span>
                    {a.flag && (
                      <Badge tone="warning" className="shrink-0 px-2 py-[3px] text-[11px] font-bold">
                        {t(`flags.${a.flag}`)}
                      </Badge>
                    )}
                    {tab === "all" && !a.flag && a.status !== "pending" && (
                      <Badge tone={STATUS_TONE[a.status]} className="shrink-0 px-2 py-[3px] text-[11px]">
                        {t(`status.${a.status}`)}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Detail panel */}
        {selected ? (
          <ApplicantDetail
            key={selected.id}
            applicant={selected}
            onStatus={(s) => setStatus(selected, s)}
            onEvaluation={(evaluation) => patch(selected.id, { evaluation })}
            onNotes={(notes) => patch(selected.id, { notes })}
          />
        ) : (
          <section className="flex grow items-center justify-center rounded-[22px] bg-white p-7 text-sm text-muted">{t("selectPrompt")}</section>
        )}
      </div>
    </div>
  );
}

function ApplicantDetail({
  applicant: a,
  onStatus,
  onEvaluation,
  onNotes,
}: {
  applicant: Applicant;
  onStatus: (s: ApplicantStatus) => void;
  onEvaluation: (e: Evaluation) => void;
  onNotes: (n: string) => void;
}) {
  const t = useTranslations("admin.teachers");
  const ts = useTranslations("common.specialties");
  const locale = useLocale();
  const teaches = new Intl.ListFormat(intlTags[locale], { style: "narrow", type: "unit" }).format(a.teaches.map((s) => (ts.has(s as never) ? ts(s as never) : s)));
  const fact = "text-xs font-semibold tracking-[1px] text-muted uppercase";

  return (
    <section aria-labelledby="applicant-name" className="flex min-w-0 grow flex-col gap-5 rounded-[22px] bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar initials={a.initials} tone={a.tone} size={76} />
        <div className="min-w-0 grow">
          <h2 id="applicant-name" className="text-[22px] font-bold">
            {a.name}
          </h2>
          <p className="text-sm break-words text-muted">
            {a.email} · {a.phone} · {a.location}
          </p>
        </div>
        <Badge tone={STATUS_TONE[a.status]} className="shrink-0 self-start px-3.5 py-2 text-[13px] font-bold sm:self-center">
          {t(`status.${a.status}`)}
        </Badge>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        {a.videoLength ? (
          <div className="relative flex aspect-video w-full shrink-0 items-center justify-center rounded-2xl bg-navy xl:w-[360px]">
            <button
              type="button"
              aria-label={t("playVideo", { name: a.name, length: a.videoLength })}
              className="inline-flex size-16 items-center justify-center rounded-full bg-orange text-navy hover:bg-yellow"
            >
              <Icon name="play" size={26} />
            </button>
            <span className="absolute start-3.5 bottom-3 text-[13px] font-semibold text-white">{t("introVideo", { length: a.videoLength })}</span>
          </div>
        ) : (
          <div className="flex aspect-video w-full shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-beige-2 text-center xl:w-[360px]">
            <Icon name="video" size={28} className="text-muted" />
            <span className="text-sm font-semibold">{t("noVideo")}</span>
          </div>
        )}
        <dl className="grid grow grid-cols-1 content-start gap-3.5 text-sm sm:grid-cols-2">
          <div>
            <dt className={fact}>{t("education")}</dt>
            <dd>{a.education}</dd>
          </div>
          <div>
            <dt className={fact}>{t("experience")}</dt>
            <dd>{t("experienceYears", { count: a.experienceYears })}</dd>
          </div>
          <div>
            <dt className={fact}>{t("teaches")}</dt>
            <dd>{teaches}</dd>
          </div>
          <div>
            <dt className={fact}>{t("rate")}</dt>
            <dd>{t("ratePer", { price: formatUsd(a.rate, locale) })}</dd>
          </div>
          <div>
            <dt className={fact}>{t("certifications")}</dt>
            <dd>
              {a.certifications.length === 0 ? (
                <span className="text-muted">{t("noneProvided")}</span>
              ) : (
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {a.certifications.map((c) => (
                    <li key={c} className="inline-flex items-center gap-1 font-semibold text-teal-dark">
                      <Icon name="paperclip" size={14} />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
          <div>
            <dt className={fact}>{t("identity")}</dt>
            <dd className={cn("inline-flex items-center gap-1.5 font-semibold", a.identity.verified ? "text-teal-deep" : "text-orange-text")}>
              <Icon name={a.identity.verified ? "shieldCheck" : "clock"} size={16} />
              {a.identity.verified ? t("identityVerified", { document: t(`documents.${a.identity.document}`) }) : t("identityPending")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-beige-2 p-5">
        <h3 className="text-[15px] font-bold">{t("evaluation")}</h3>
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3 xl:grid-cols-5">
          {EVAL_FIELDS.map((key) => (
            <label key={key} className="flex flex-col gap-1.5">
              {t(`evalFields.${key}`)}
              <select value={a.evaluation[key]} onChange={(e) => onEvaluation({ ...a.evaluation, [key]: Number(e.target.value) as Score })} className={control}>
                {SCORES.map((n) => (
                  <option key={n} value={n}>
                    {t(`scores.${n}`)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          {t("internalNotes")}
          <textarea
            rows={2}
            value={a.notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            className="resize-none rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-auto flex flex-wrap justify-end gap-2.5">
        {(a.status === "pending" || a.status === "interview") && (
          <>
            <Button variant="outlineLight" className="font-semibold" onClick={() => onStatus("interview")} disabled={a.status === "interview"}>
              {a.status === "interview" ? t("interviewRequested") : t("requestInterview")}
            </Button>
            <Button variant="dangerOutline" onClick={() => onStatus("rejected")}>
              {t("reject")}
            </Button>
            <Button variant="teal" className="px-[26px] font-bold" onClick={() => onStatus("approved")}>
              {t("approve")}
            </Button>
          </>
        )}
        {a.status === "approved" && (
          <Button variant="dangerOutline" onClick={() => onStatus("suspended")}>
            {t("suspend")}
          </Button>
        )}
        {a.status === "suspended" && (
          <Button variant="teal" onClick={() => onStatus("approved")}>
            {t("reinstate")}
          </Button>
        )}
        {a.status === "rejected" && (
          <Button variant="outlineLight" className="font-semibold" onClick={() => onStatus("pending")}>
            {t("reopen")}
          </Button>
        )}
      </div>
    </section>
  );
}
