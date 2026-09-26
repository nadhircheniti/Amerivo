"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Avatar, Badge, type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { Applicant, ApplicantStatus, Evaluation, Score } from "../_data";

type TabId = "all" | "pending" | "approved" | "rejected" | "suspended";

const STATUS: Record<ApplicantStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending review", tone: "warning" },
  interview: { label: "Interview requested", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "neutral" },
};

const inTab = (s: ApplicantStatus, tab: TabId) =>
  tab === "all" || (tab === "pending" ? s === "pending" || s === "interview" : s === tab);

const EVAL_FIELDS: { key: keyof Evaluation; label: string }[] = [
  { key: "fluency", label: "English fluency" },
  { key: "professionalism", label: "Professionalism" },
  { key: "teaching", label: "Teaching ability" },
  { key: "camera", label: "Camera quality" },
  { key: "internet", label: "Internet quality" },
];

const SCORE_LABEL: Record<Score, string> = { 5: "5 – Excellent", 4: "4 – Good", 3: "3 – Average", 2: "2 – Weak", 1: "1 – Poor" };

const control = "h-10 rounded-[10px] border border-line bg-white px-2 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none";

export function TeacherManagement({ initial }: { initial: Applicant[] }) {
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<TabId>("pending");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? null);
  const [notice, setNotice] = useState("");
  const base = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const pendingCount = list.filter((a) => inTab(a.status, "pending")).length;
  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: `Pending (${pendingCount})` },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "suspended", label: "Suspended" },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((a) => inTab(a.status, tab) && (!q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)));
  }, [list, tab, query]);

  const selected = list.find((a) => a.id === selectedId) ?? null;

  const patch = (id: string, p: Partial<Applicant>) => setList((l) => l.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const setStatus = (a: Applicant, status: ApplicantStatus) => {
    patch(a.id, { status });
    const movedTo = status === "interview" || status === "pending" ? "Pending" : STATUS[status].label;
    setNotice(
      status === "interview"
        ? `Interview requested from ${a.name}. They stay in Pending.`
        : `${a.name} is now ${STATUS[status].label.toLowerCase()} and moved to the ${movedTo} tab.`,
    );
  };

  const changeTab = (id: TabId) => {
    setTab(id);
    const first = list.find((a) => inTab(a.status, id));
    if (first && !(selected && inTab(selected.status, id))) setSelectedId(first.id);
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].id;
    changeTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold sm:text-[28px]">Teacher management</h1>
        <label className="flex h-11 w-full items-center gap-2.5 rounded-[10px] border border-line bg-white px-3.5 focus-within:border-teal-dark sm:w-[300px]">
          <Icon name="search" size={18} className="shrink-0 text-muted" />
          <span className="sr-only">Search teachers</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="min-w-0 grow bg-transparent text-sm text-navy placeholder:text-muted outline-none"
          />
        </label>
      </header>

      <div role="tablist" aria-label="Teacher status" className="flex gap-1.5 overflow-x-auto border-b border-sand" onKeyDown={onTabKey}>
        {tabs.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${base}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => changeTab(t.id)}
            className={cn(
              "h-11 shrink-0 border-b-[3px] px-4 text-sm whitespace-nowrap",
              tab === t.id ? "border-teal-dark font-bold text-navy" : "border-transparent text-muted hover:text-navy",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className={cn("rounded-xl bg-teal-100 px-4 py-2.5 text-sm text-teal-deep", !notice && "sr-only")}>
        {notice}
      </p>

      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab}`} className="flex flex-col gap-5 lg:flex-row">
        {/* Applicant list */}
        <section aria-label="Applicants" className="flex w-full shrink-0 flex-col gap-2.5 lg:w-80">
          {visible.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-muted">No teachers match this view.</p>}
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
                      "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-[14px] text-left",
                      active ? "border-teal-dark" : "border-transparent hover:border-line",
                    )}
                  >
                    <Avatar initials={a.initials} tone={a.tone} size={46} />
                    <span className="min-w-0 grow">
                      <span className="block font-semibold">{a.name}</span>
                      <span className="block text-[13px] text-muted">
                        {a.city} · {a.status === "pending" || a.status === "interview" ? "applied " : "since "}
                        {a.applied}
                      </span>
                    </span>
                    {a.flag && <Badge tone="warning" className="shrink-0 px-2 py-[3px] text-[11px] font-bold">{a.flag}</Badge>}
                    {tab === "all" && !a.flag && a.status !== "pending" && (
                      <Badge tone={STATUS[a.status].tone} className="shrink-0 px-2 py-[3px] text-[11px]">
                        {STATUS[a.status].label}
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
          <section className="flex grow items-center justify-center rounded-[22px] bg-white p-7 text-sm text-muted">Select a teacher to review.</section>
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
  const s = STATUS[a.status];
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
        <Badge tone={s.tone} className="shrink-0 self-start px-3.5 py-2 text-[13px] font-bold sm:self-center">
          {s.label}
        </Badge>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        {a.videoLength ? (
          <div className="relative flex aspect-video w-full shrink-0 items-center justify-center rounded-2xl bg-navy xl:w-[360px]">
            <button
              type="button"
              aria-label={`Play ${a.name}'s introduction video (${a.videoLength})`}
              className="inline-flex size-16 items-center justify-center rounded-full bg-orange text-navy hover:bg-yellow"
            >
              <Icon name="play" size={26} />
            </button>
            <span className="absolute bottom-3 left-3.5 text-[13px] font-semibold text-white">Introduction video · {a.videoLength}</span>
          </div>
        ) : (
          <div className="flex aspect-video w-full shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-beige-2 text-center xl:w-[360px]">
            <Icon name="video" size={28} className="text-muted" />
            <span className="text-sm font-semibold">No introduction video uploaded</span>
          </div>
        )}
        <dl className="grid grow grid-cols-1 content-start gap-3.5 text-sm sm:grid-cols-2">
          <div>
            <dt className={fact}>Education</dt>
            <dd>{a.education}</dd>
          </div>
          <div>
            <dt className={fact}>Experience</dt>
            <dd>{a.experience}</dd>
          </div>
          <div>
            <dt className={fact}>Teaches</dt>
            <dd>{a.teaches}</dd>
          </div>
          <div>
            <dt className={fact}>Rate</dt>
            <dd>${a.rate} / 50 min</dd>
          </div>
          <div>
            <dt className={fact}>Certifications</dt>
            <dd>
              {a.certifications.length === 0 ? (
                <span className="text-muted">None provided</span>
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
            <dt className={fact}>Identity (Stripe Identity)</dt>
            <dd className={cn("inline-flex items-center gap-1.5 font-semibold", a.identity.verified ? "text-teal-deep" : "text-orange-text")}>
              <Icon name={a.identity.verified ? "shieldCheck" : "clock"} size={16} />
              {a.identity.label}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-beige-2 p-5">
        <h3 className="text-[15px] font-bold">Evaluation</h3>
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3 xl:grid-cols-5">
          {EVAL_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5">
              {f.label}
              <select
                value={a.evaluation[f.key]}
                onChange={(e) => onEvaluation({ ...a.evaluation, [f.key]: Number(e.target.value) as Score })}
                className={control}
              >
                {([5, 4, 3, 2, 1] as Score[]).map((n) => (
                  <option key={n} value={n}>
                    {SCORE_LABEL[n]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Internal notes
          <textarea
            rows={2}
            value={a.notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder="Visible to admins only"
            className="resize-none rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-auto flex flex-wrap justify-end gap-2.5">
        {(a.status === "pending" || a.status === "interview") && (
          <>
            <Button variant="outlineLight" className="font-semibold" onClick={() => onStatus("interview")} disabled={a.status === "interview"}>
              {a.status === "interview" ? "Interview requested" : "Request interview"}
            </Button>
            <Button variant="dangerOutline" onClick={() => onStatus("rejected")}>
              Reject
            </Button>
            <Button variant="teal" className="px-[26px] font-bold" onClick={() => onStatus("approved")}>
              Approve teacher
            </Button>
          </>
        )}
        {a.status === "approved" && (
          <Button variant="dangerOutline" onClick={() => onStatus("suspended")}>
            Suspend
          </Button>
        )}
        {a.status === "suspended" && (
          <Button variant="teal" onClick={() => onStatus("approved")}>
            Reinstate
          </Button>
        )}
        {a.status === "rejected" && (
          <Button variant="outlineLight" className="font-semibold" onClick={() => onStatus("pending")}>
            Reopen application
          </Button>
        )}
      </div>
    </section>
  );
}
