"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, Badge, type AvatarTone, type BadgeTone } from "@/components/ui/primitives";
import { intlTags, isRtl, type Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/mock-data";
import { useApi } from "@/lib/use-api";
import { videoEmbedUrl } from "../_video";

/* ---------- API shapes (GET /admin/teachers) ---------- */

type TeacherStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
type Decision = "approved" | "rejected" | "suspended" | "pending";
type IdentityStatus = "not_started" | "pending" | "verified" | "failed";
type InterviewPreference = "weekdayMornings" | "weekdayAfternoons" | "weekdayEvenings" | "weekends";

export type AdminTeacher = {
  id: string;
  slug: string;
  status: TeacherStatus;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  gender: string | null;
  headline: string | null;
  bio: string | null;
  education: string | null;
  yearsExperience: number | null;
  specialties: string[] | null;
  teaches: ("adults" | "teens")[] | null;
  languages: { language: string; level: string }[] | null;
  certifications: { name: string; fileUrl?: string | null }[] | null;
  priceCents: number | null;
  offersTrial: boolean | null;
  identityStatus: IdentityStatus;
  introVideoUrl: string | null;
  interviewPreference: InterviewPreference | null;
  ratingAvgX100: number | null;
  lessonsCompleted: number | null;
  approvedAt: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  interviewRequestedAt: string | null;
  lastDecision: null | { decision: Decision; notes: string | null; evaluation: Record<string, number> | null; decidedAt: string };
};

/* ---------- Constants ---------- */

type TabId = "pending" | "approved" | "rejected" | "suspended" | "draft";
const TAB_IDS: TabId[] = ["pending", "approved", "rejected", "suspended", "draft"];

const STATUS_TONE: Record<TeacherStatus, BadgeTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "neutral",
};

const IDENTITY_TONE: Record<IdentityStatus, BadgeTone> = {
  not_started: "neutral",
  pending: "info",
  verified: "success",
  failed: "danger",
};

/** API evaluation keys → label keys already used by the design (admin.teachers.evalFields.*). */
const EVAL_FIELDS = [
  { api: "fluency", label: "fluency" },
  { api: "professionalism", label: "professionalism" },
  { api: "teachingAbility", label: "teaching" },
  { api: "cameraQuality", label: "camera" },
  { api: "internetQuality", label: "internet" },
] as const;
type EvalKey = (typeof EVAL_FIELDS)[number]["api"];

const SCORES = [5, 4, 3, 2, 1] as const;
const TONES: AvatarTone[] = ["teal", "sky", "lilac", "orange", "yellow", "sand"];

const control = "h-10 rounded-[10px] border border-line bg-white px-2 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none";
const fact = "text-xs font-semibold tracking-[1px] text-muted uppercase";

const fullName = (a: AdminTeacher) => [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || a.slug;
const initialsOf = (a: AdminTeacher) => ((a.firstName?.[0] ?? "") + (a.lastName?.[0] ?? "")).toUpperCase() || (a.email?.[0] ?? "?").toUpperCase();
const toneOf = (id: string) => TONES[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
const placeOf = (a: AdminTeacher) => [a.city, a.country].filter(Boolean).join(", ");
const time = (d: string | null | undefined) => (d ? new Date(d).getTime() : 0);

/** Oldest first for the review queue; most recent first elsewhere. */
function sortKey(a: AdminTeacher): number {
  switch (a.status) {
    case "pending":
      return -time(a.submittedAt ?? a.createdAt);
    case "approved":
      return time(a.approvedAt ?? a.lastDecision?.decidedAt);
    case "draft":
      return time(a.createdAt);
    default:
      return time(a.lastDecision?.decidedAt ?? a.createdAt);
  }
}

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError || e instanceof Error ? e.message || fallback : fallback);

/* ---------- Main component ---------- */

export function LiveTeacherManagement() {
  const t = useTranslations("admin.teachers");
  const tl = useTranslations("admin.teachers.live");
  const locale = useLocale() as Locale;
  const { call, isLoaded, isSignedIn } = useApi();
  const [rows, setRows] = useState<AdminTeacher[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [tab, setTab] = useState<TabId>("pending");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const base = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dateFmt = new Intl.DateTimeFormat(intlTags[locale], { day: "numeric", month: "short", year: "numeric" });

  const fetchRows = useCallback(() => call<AdminTeacher[]>("/admin/teachers"), [call]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    fetchRows()
      .then((r) => !cancelled && (setRows(r), setLoadError(null)))
      .catch((e: unknown) => !cancelled && setLoadError(errorText(e, tl("loadError"))));
    return () => {
      cancelled = true;
    };
  }, [fetchRows, isLoaded, isSignedIn, tl]);

  const retry = async () => {
    setRetrying(true);
    try {
      setRows(await fetchRows());
      setLoadError(null);
    } catch (e) {
      setLoadError(errorText(e, tl("loadError")));
    } finally {
      setRetrying(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { pending: 0, approved: 0, rejected: 0, suspended: 0, draft: 0 };
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((a) => a.status === tab && (!q || fullName(a).toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q)))
      .sort((x, y) => sortKey(y) - sortKey(x));
  }, [rows, tab, query]);

  // Keep the chosen teacher; if it left this tab (after an action), show the next one in the queue.
  const selected = visible.find((a) => a.id === selectedId) ?? visible[0] ?? null;

  /** Sends an action, then reloads the list. Throws ApiError so the detail panel can show it. */
  const act = async (a: AdminTeacher, path: string, body: object, done: Decision | "interview") => {
    await call(path, { method: "POST", body: JSON.stringify(body) });
    setNotice(t(`notice.${done}`, { name: fullName(a) }));
    try {
      setRows(await fetchRows());
    } catch {
      // The action succeeded; if the reload fails, update the row locally.
      setRows((l) => (l ?? []).map((r) => (r.id !== a.id ? r : done === "interview" ? { ...r, interviewRequestedAt: new Date().toISOString() } : { ...r, status: done })));
    }
  };

  const changeTab = (id: TabId) => {
    setTab(id);
    setNotice("");
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const forward = (e.key === "ArrowRight") !== isRtl(locale);
    const i = TAB_IDS.indexOf(tab);
    const next = TAB_IDS[(i + (forward ? 1 : TAB_IDS.length - 1)) % TAB_IDS.length];
    changeTab(next);
    tabRefs.current[next]?.focus();
  };

  const header = (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-extrabold sm:text-[28px]">{t("title")}</h1>
      {rows && (
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
      )}
    </header>
  );

  if (!rows) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {loadError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6 sm:p-7">
            <p className="font-semibold">{tl("loadError")}</p>
            <p className="text-sm text-muted">{tl("wakingUp")}</p>
            <p className="text-[13px] break-words text-orange-text">{loadError}</p>
            <Button variant="teal" size="sm" onClick={retry} disabled={retrying}>
              <Icon name="repeat" size={16} />
              {retrying ? tl("loading") : tl("retry")}
            </Button>
          </div>
        ) : (
          <div role="status" className="flex flex-col gap-1.5 rounded-[22px] bg-white p-6 sm:p-7">
            <p className="font-semibold">{tl("loading")}</p>
            <p className="text-sm text-muted">{tl("wakingUp")}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}

      <div role="tablist" aria-label={t("statusTabs")} className="flex gap-1.5 overflow-x-auto border-b border-sand" onKeyDown={onTabKey}>
        {TAB_IDS.map((id) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[id] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`${base}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => changeTab(id)}
            className={cn(
              "h-11 shrink-0 border-b-[3px] px-4 text-sm whitespace-nowrap",
              id === "draft" && "ms-auto text-[13px]",
              tab === id ? "border-teal-dark font-bold text-navy" : cn("border-transparent hover:text-navy", id === "draft" ? "text-muted/80" : "text-muted"),
            )}
          >
            {tl(`tabs.${id}`, { count: counts[id] })}
          </button>
        ))}
      </div>

      <p aria-live="polite" className={cn("rounded-xl bg-teal-100 px-4 py-2.5 text-sm text-teal-deep", !notice && "sr-only")}>
        {notice}
      </p>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab}`} className="flex flex-col gap-5 lg:flex-row">
        <section aria-label={t("applicants")} className="flex w-full shrink-0 flex-col gap-2.5 lg:w-80">
          {tab === "draft" && <p className="px-1 text-[13px] text-muted">{tl("draftsHint")}</p>}
          {visible.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-muted">{query.trim() ? t("empty") : tl(`empty.${tab}`)}</p>}
          <ul className="flex flex-col gap-2.5">
            {visible.map((a) => {
              const active = a.id === selected?.id;
              const place = placeOf(a) || tl("notProvided");
              const line =
                a.status === "pending" && a.submittedAt
                  ? tl("listSubmitted", { place, date: dateFmt.format(new Date(a.submittedAt)) })
                  : a.status === "approved" && a.approvedAt
                    ? tl("listApproved", { place, date: dateFmt.format(new Date(a.approvedAt)) })
                    : a.status !== "draft" && a.lastDecision
                      ? tl("listDecided", { place, date: dateFmt.format(new Date(a.lastDecision.decidedAt)) })
                      : a.createdAt
                        ? tl("listStarted", { place, date: dateFmt.format(new Date(a.createdAt)) })
                        : place;
              const flag =
                a.status === "pending" ? (a.identityStatus !== "verified" ? "idNotVerified" : !a.introVideoUrl ? "noVideo" : a.interviewRequestedAt ? "interview" : null) : null;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-[14px] text-start",
                      active ? "border-teal-dark" : "border-transparent hover:border-line",
                      a.status === "draft" && !active && "opacity-80",
                    )}
                  >
                    <Avatar initials={initialsOf(a)} tone={toneOf(a.id)} size={46} />
                    <span className="min-w-0 grow">
                      <span className="block truncate font-semibold">{fullName(a)}</span>
                      <span className="block text-[13px] text-muted">{line}</span>
                    </span>
                    {flag && (
                      <Badge tone={flag === "interview" ? "info" : "warning"} className="shrink-0 px-2 py-[3px] text-[11px] font-bold">
                        {tl(`flags.${flag}`)}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {selected ? (
          <TeacherDetail key={selected.id} teacher={selected} act={act} />
        ) : (
          <section className="flex grow items-center justify-center rounded-[22px] bg-white p-7 text-sm text-muted">{t("selectPrompt")}</section>
        )}
      </div>
    </div>
  );
}

/* ---------- Detail panel ---------- */

type Act = (a: AdminTeacher, path: string, body: object, done: Decision | "interview") => Promise<void>;

function TeacherDetail({ teacher: a, act }: { teacher: AdminTeacher; act: Act }) {
  const t = useTranslations("admin.teachers");
  const tl = useTranslations("admin.teachers.live");
  // Degree ids saved by the application form ("bachelor", "master"…) shown with their label.
  const te = useTranslations("apply.options.education");
  const education = (v: string) => (te.has(v as never) ? te(v as never) : v);
  const ts = useTranslations("common.specialties");
  const ta = useTranslations("common.audiences");
  const locale = useLocale() as Locale;
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState<Partial<Record<EvalKey, number>>>({});
  const [confirming, setConfirming] = useState<"reject" | "suspend" | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = useId();

  const name = fullName(a);
  const dateFmt = new Intl.DateTimeFormat(intlTags[locale], { day: "numeric", month: "long", year: "numeric" });
  const fmtDate = (d: string | null | undefined) => (d ? dateFmt.format(new Date(d)) : null);
  const list = (items: string[]) => new Intl.ListFormat(intlTags[locale], { style: "narrow", type: "unit" }).format(items);
  const embed = videoEmbedUrl(a.introVideoUrl);
  const interviewing = a.status === "pending" && !!a.interviewRequestedAt;
  const canApprove = a.identityStatus === "verified";

  const specialties = (a.specialties ?? []).map((s) => (ts.has(s as never) ? ts(s as never) : s));
  const audiences = (a.teaches ?? []).map((s) => {
    const key = s.charAt(0).toUpperCase() + s.slice(1);
    return ta.has(key as never) ? ta(key as never) : s;
  });

  const statusLabel = (s: TeacherStatus) => (s === "draft" ? tl("draftStatus") : t(`status.${s}`));
  const evalLabel = (k: string) => {
    const f = EVAL_FIELDS.find((x) => x.api === k);
    return f ? t(`evalFields.${f.label}`) : k;
  };

  const run = async (path: string, body: object, done: Decision | "interview") => {
    setSending(true);
    setError(null);
    try {
      await act(a, path, body, done);
      // On success the panel usually unmounts (the teacher moves to another tab); reset in case it stays.
      setNotes("");
      setConfirming(null);
    } catch (e) {
      setError(errorText(e, tl("actionError")));
    } finally {
      setSending(false);
    }
  };

  const note = notes.trim() || undefined;
  const decide = (decision: Decision) => {
    const evaluation = decision === "approved" && a.status === "pending" && Object.keys(scores).length ? scores : undefined;
    return run(`/admin/teachers/${a.id}/decision`, { decision, notes: note, evaluation }, decision);
  };

  return (
    <section aria-labelledby={`${uid}-name`} className="flex min-w-0 grow flex-col gap-5 rounded-[22px] bg-white p-5 sm:p-7">
      {/* Identity header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar initials={initialsOf(a)} tone={toneOf(a.id)} size={76} />
        <div className="min-w-0 grow">
          <h2 id={`${uid}-name`} className="text-[22px] font-bold break-words">
            {name}
          </h2>
          <p className="text-sm break-words text-muted">{[a.email, a.phone, placeOf(a)].filter(Boolean).join(" · ")}</p>
          {a.headline && <p className="mt-1 text-[15px] font-semibold break-words">{a.headline}</p>}
        </div>
        <Badge tone={interviewing ? "info" : STATUS_TONE[a.status]} className="shrink-0 self-start px-3.5 py-2 text-[13px] font-bold sm:self-center">
          {interviewing ? t("status.interview") : statusLabel(a.status)}
        </Badge>
      </div>

      {a.status === "draft" && <p className="rounded-xl bg-beige-2 px-4 py-2.5 text-sm text-muted">{tl("draftNotice")}</p>}

      <div className="flex flex-col gap-5 xl:flex-row">
        {/* Introduction video */}
        {embed ? (
          <div className="aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-navy xl:w-[360px]">
            <iframe
              src={embed}
              title={tl("videoTitle", { name })}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : a.introVideoUrl ? (
          <div className="flex aspect-video w-full shrink-0 flex-col items-center justify-center gap-3 rounded-2xl bg-navy p-4 text-center xl:w-[360px]">
            <Icon name="video" size={28} className="text-white" />
            <span className="text-sm text-white/80">{tl("videoElsewhere")}</span>
            <a
              href={a.introVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-orange px-4 text-sm font-bold text-navy hover:bg-yellow"
            >
              <Icon name="play" size={16} />
              {tl("openVideo")}
              <span className="sr-only">{tl("newTab")}</span>
            </a>
          </div>
        ) : (
          <div className="flex aspect-video w-full shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-beige-2 text-center xl:w-[360px]">
            <Icon name="video" size={28} className="text-muted" />
            <span className="text-sm font-semibold">{t("noVideo")}</span>
          </div>
        )}

        {/* Facts */}
        <dl className="grid grow grid-cols-1 content-start gap-3.5 text-sm sm:grid-cols-2">
          <Fact label={t("education")}>{a.education ? education(a.education) : <Muted>{tl("notProvided")}</Muted>}</Fact>
          <Fact label={t("experience")}>{a.yearsExperience == null ? <Muted>{tl("notProvided")}</Muted> : t("experienceYears", { count: a.yearsExperience })}</Fact>
          <Fact label={tl("specialties")}>{specialties.length ? list(specialties) : <Muted>{tl("notProvided")}</Muted>}</Fact>
          <Fact label={t("teaches")}>{audiences.length ? list(audiences) : <Muted>{tl("notProvided")}</Muted>}</Fact>
          <Fact label={tl("languages")}>
            {a.languages?.length ? (
              <ul>
                {a.languages.map((l) => (
                  <li key={`${l.language}-${l.level}`}>{tl("languageLevel", { language: l.language, level: l.level })}</li>
                ))}
              </ul>
            ) : (
              <Muted>{tl("notProvided")}</Muted>
            )}
          </Fact>
          <Fact label={t("certifications")}>
            {a.certifications?.length ? (
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {a.certifications.map((c, i) => (
                  <li key={`${c.name}-${i}`} className="inline-flex items-center gap-1 font-semibold text-teal-dark">
                    <Icon name="paperclip" size={14} />
                    {c.fileUrl ? (
                      <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                        {c.name}
                        <span className="sr-only"> {tl("newTab")}</span>
                      </a>
                    ) : (
                      c.name
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Muted>{t("noneProvided")}</Muted>
            )}
          </Fact>
          <Fact label={t("rate")}>{a.priceCents == null ? <Muted>{tl("notProvided")}</Muted> : t("ratePer", { price: formatUsd(a.priceCents / 100, locale) })}</Fact>
          <Fact label={tl("trial")}>{a.offersTrial ? tl("trialOn") : tl("trialOff")}</Fact>
          <Fact label={tl("timezone")}>{a.timezone || <Muted>{tl("notProvided")}</Muted>}</Fact>
          <Fact label={tl("interviewPreference")}>{a.interviewPreference ? tl(`interviewPrefs.${a.interviewPreference}`) : <Muted>{tl("notProvided")}</Muted>}</Fact>
          <Fact label={tl("dates")}>
            <ul>
              {a.createdAt && <li>{tl("createdOn", { date: fmtDate(a.createdAt)! })}</li>}
              {a.submittedAt && <li>{tl("submittedOn", { date: fmtDate(a.submittedAt)! })}</li>}
              {a.approvedAt && <li>{tl("approvedOn", { date: fmtDate(a.approvedAt)! })}</li>}
              {a.interviewRequestedAt && <li>{tl("interviewRequestedOn", { date: fmtDate(a.interviewRequestedAt)! })}</li>}
            </ul>
          </Fact>
          <div className="sm:col-span-2">
            <dt className={fact}>{t("identity")}</dt>
            <dd className="mt-1 flex flex-col items-start gap-1.5">
              <Badge tone={IDENTITY_TONE[a.identityStatus]} className="font-bold">
                <Icon name={a.identityStatus === "verified" ? "shieldCheck" : a.identityStatus === "failed" ? "x" : "clock"} size={14} />
                {tl(`identityStatus.${a.identityStatus}`)}
              </Badge>
              <span className="text-[13px] text-muted">{tl("identityNote")}</span>
            </dd>
          </div>
        </dl>
      </div>

      {a.bio && (
        <div className="flex flex-col gap-1.5">
          <h3 className={fact}>{tl("bio")}</h3>
          <p className="text-sm leading-relaxed break-words whitespace-pre-line">{a.bio}</p>
        </div>
      )}

      {a.lastDecision && (
        <div className="flex flex-col gap-2 rounded-2xl border border-line p-4 text-sm">
          <h3 className="text-[15px] font-bold">{tl("lastDecision")}</h3>
          <p>
            <Badge tone={STATUS_TONE[a.lastDecision.decision]} className="me-2">
              {statusLabel(a.lastDecision.decision)}
            </Badge>
            <span className="text-muted">{fmtDate(a.lastDecision.decidedAt)}</span>
          </p>
          {a.lastDecision.notes && (
            <p className="break-words whitespace-pre-line">
              <span className="font-semibold">{tl("sentNotes")} </span>
              {a.lastDecision.notes}
            </p>
          )}
          {a.lastDecision.evaluation && Object.keys(a.lastDecision.evaluation).length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              {Object.entries(a.lastDecision.evaluation).map(([k, v]) => (
                <li key={k}>{tl("scoreLine", { field: evalLabel(k), score: v })}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      {a.status !== "draft" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-beige-2 p-5">
          {a.status === "pending" && (
            <>
              <h3 className="text-[15px] font-bold">{t("evaluation")}</h3>
              <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3 xl:grid-cols-5">
                {EVAL_FIELDS.map((f) => (
                  <label key={f.api} className="flex flex-col gap-1.5">
                    {t(`evalFields.${f.label}`)}
                    <select
                      value={scores[f.api] ?? ""}
                      disabled={sending}
                      onChange={(e) => {
                        const v = e.target.value;
                        setScores((s) => {
                          const next = { ...s };
                          if (v) next[f.api] = Number(v);
                          else delete next[f.api];
                          return next;
                        });
                      }}
                      className={control}
                    >
                      <option value="">{tl("notRated")}</option>
                      {SCORES.map((n) => (
                        <option key={n} value={n}>
                          {t(`scores.${n}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="text-[13px] text-muted">{tl("evaluationHint")}</p>
            </>
          )}
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            {tl("notes")}
            <textarea
              rows={3}
              value={notes}
              disabled={sending}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tl("notesPlaceholder")}
              aria-describedby={`${uid}-notes-hint`}
              className="resize-y rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none"
            />
            <span id={`${uid}-notes-hint`} className="font-normal text-muted">
              {tl("notesHint")}
            </span>
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-2.5 text-sm break-words text-[#a52f22]">
          {error}
        </p>
      )}

      {confirming ? (
        <div role="group" aria-labelledby={`${uid}-confirm`} className="mt-auto flex flex-col gap-3 rounded-2xl border border-danger p-4 sm:flex-row sm:items-center">
          <p id={`${uid}-confirm`} className="grow text-sm font-semibold">
            {confirming === "reject" ? tl("confirmReject", { name }) : tl("confirmSuspend", { name })}
          </p>
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="outlineLight" size="sm" onClick={() => setConfirming(null)} disabled={sending}>
              {tl("cancel")}
            </Button>
            <Button variant="danger" size="sm" onClick={() => decide(confirming === "reject" ? "rejected" : "suspended")} disabled={sending}>
              {sending ? tl("sending") : confirming === "reject" ? tl("confirmRejectYes") : tl("confirmSuspendYes")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2.5">
            {a.status === "approved" && a.slug && (
              <ButtonLink href={`/teachers/${a.slug}`} variant="ghost" className="me-auto h-12 px-2">
                {tl("viewProfile")}
                <Icon name="arrowRight" size={16} />
              </ButtonLink>
            )}
            {a.status === "pending" && (
              <>
                <Button variant="outlineLight" className="font-semibold" disabled={sending} onClick={() => run(`/admin/teachers/${a.id}/interview`, { notes: note }, "interview")}>
                  {interviewing ? tl("requestInterviewAgain") : t("requestInterview")}
                </Button>
                <Button variant="dangerOutline" disabled={sending} onClick={() => setConfirming("reject")}>
                  {t("reject")}
                </Button>
                <Button
                  variant="teal"
                  className="px-[26px] font-bold"
                  disabled={sending || !canApprove}
                  aria-describedby={canApprove ? undefined : `${uid}-approve-hint`}
                  onClick={() => decide("approved")}
                >
                  {sending ? tl("sending") : t("approve")}
                </Button>
              </>
            )}
            {a.status === "approved" && (
              <Button variant="dangerOutline" disabled={sending} onClick={() => setConfirming("suspend")}>
                {t("suspend")}
              </Button>
            )}
            {a.status === "suspended" && (
              <Button variant="teal" disabled={sending} onClick={() => decide("approved")}>
                {sending ? tl("sending") : t("reinstate")}
              </Button>
            )}
            {a.status === "rejected" && (
              <Button variant="outlineLight" className="font-semibold" disabled={sending} onClick={() => decide("pending")}>
                {sending ? tl("sending") : t("reopen")}
              </Button>
            )}
          </div>
          {a.status === "pending" && !canApprove && (
            <p id={`${uid}-approve-hint`} className="text-end text-[13px] text-orange-text">
              {tl("approveNeedsIdentity")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={fact}>{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>;
}
