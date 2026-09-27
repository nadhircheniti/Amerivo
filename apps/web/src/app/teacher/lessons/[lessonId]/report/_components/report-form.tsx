"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import type { ReportDraft, ReportLesson } from "../_data";

const attendanceOptions = [
  { value: "attended", label: "attended" },
  { value: "late", label: "late" },
  { value: "no-show", label: "noShow" },
] as const satisfies readonly { value: ReportDraft["attendance"]; label: string }[];

const ratingFields = [{ key: "fluency" }, { key: "accuracy" }, { key: "engagement" }] as const;

function formatDate(iso: string, tag: string) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
}

export function ReportForm({ lesson }: { lesson: ReportLesson }) {
  const t = useTranslations("teacher.report");
  const tag = intlTags[useLocale() as Locale];
  const [r, setR] = useState<ReportDraft>(lesson.draft);
  const [status, setStatus] = useState<"editing" | "draft-saved" | "sent">("editing");
  const set = <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setR((cur) => ({ ...cur, [key]: value }));
    if (status === "draft-saved") setStatus("editing");
  };
  const first = lesson.student.firstName;
  const due = formatDate(r.dueDate, tag);

  function send(e: FormEvent) {
    e.preventDefault();
    // TODO(api): POST the report; the student summary + review request are sent by apps/api.
    setStatus("sent");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (status === "sent") {
    return (
      <Card className="mx-auto flex max-w-[640px] flex-col items-center gap-4 rounded-[28px] p-10 text-center" role="status">
        <span className="flex size-16 items-center justify-center rounded-full bg-teal-100 text-teal-dark">
          <Icon name="check" size={30} strokeWidth={2.4} />
        </span>
        <h1 className="text-[26px] font-extrabold">{t("sentTitle", { name: first })}</h1>
        <p className="text-[15px] text-muted">
          {due ? t("sentBodyDue", { name: first, date: due }) : t("sentBody", { name: first })}
        </p>
        <ButtonLink href="/teacher" variant="teal" className="mt-2">
          {t("back")}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <form onSubmit={send} className="flex flex-col gap-5 rounded-[28px] bg-white p-6 sm:p-9">
        <div className="flex flex-col gap-1.5">
          <Eyebrow className="text-xs tracking-[3px]">{t("eyebrow")}</Eyebrow>
          <h1 className="text-[28px] font-extrabold">{t("title")}</h1>
          <p className="text-[15px] text-muted">
            {t("meta", {
              name: lesson.student.name,
              date: formatDate(lesson.date, tag) ?? "",
              minutes: lesson.durationMin,
              lessons: lesson.returning.lessons,
              hours: lesson.returning.hours.toLocaleString(tag),
            })}
          </p>
        </div>

        <fieldset className="flex flex-wrap items-center gap-2.5">
          <legend className="mb-2.5 font-display text-sm font-bold">{t("attendance")}</legend>
          {attendanceOptions.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm has-[:checked]:border-2 has-[:checked]:border-teal-dark has-[:checked]:bg-teal-50 has-[:checked]:font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal"
            >
              <input type="radio" name="attendance" value={o.value} checked={r.attendance === o.value} onChange={() => set("attendance", o.value)} />
              {t(o.label)}
            </label>
          ))}
        </fieldset>

        <Field label={t("topics")}>
          <Textarea rows={2} value={r.topics} onChange={(e) => set("topics", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("strengths")}>
            <Textarea rows={3} value={r.strengths} onChange={(e) => set("strengths", e.target.value)} />
          </Field>
          <Field label={t("development")}>
            <Textarea rows={3} value={r.development} onChange={(e) => set("development", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label={t("homework")}>
            <Textarea rows={2} value={r.homework} onChange={(e) => set("homework", e.target.value)} />
          </Field>
          <Field label={t("dueDate")}>
            <Input type="date" value={r.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="h-12 text-sm" />
          </Field>
        </div>
        <Field label={t("recommendation")}>
          <Textarea rows={2} value={r.recommendation} onChange={(e) => set("recommendation", e.target.value)} />
        </Field>

        <fieldset className="flex flex-col gap-3 rounded-2xl bg-beige p-[18px]">
          <legend className="float-start flex w-full items-center gap-2 text-sm font-semibold">
            <Icon name="lock" size={16} strokeWidth={2} />
            {t("privateRating")}
          </legend>
          <div className="grid gap-3.5 text-[13px] sm:grid-cols-3">
            {ratingFields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="flex justify-between">
                  {t(f.key)}
                  <span className="font-semibold" aria-hidden="true">
                    {r[f.key]}/5
                  </span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={r[f.key]}
                  aria-valuetext={t("outOf5", { value: r[f.key] })}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          <span role="status" className="me-auto text-sm text-teal-deep">
            {status === "draft-saved" && (
              <span className="flex items-center gap-1.5">
                <Icon name="check" size={16} strokeWidth={2.4} />
                {t("draftSaved")}
              </span>
            )}
          </span>
          {/* TODO(api): persist the draft. */}
          <Button variant="outline" className="h-[52px]" onClick={() => setStatus("draft-saved")}>
            {t("saveDraft")}
          </Button>
          <Button type="submit" variant="teal" className="h-[52px] px-7 font-bold">
            {t("send", { name: first })}
          </Button>
        </div>
      </form>

      {/* What the student receives */}
      <aside aria-label={t("previewLabel", { name: first })} className="flex flex-col gap-4 xl:sticky xl:top-8">
        <p className="text-sm text-muted">{t("previewTitle", { name: first })}</p>
        <div className="flex flex-col gap-4 rounded-[28px] bg-navy p-8 text-white">
          <Eyebrow onDark className="text-xs tracking-[3px]">
            {t("studentView")}
          </Eyebrow>
          <h2 className="text-[26px] font-bold">{t("niceWork", { name: first })}</h2>
          <div className="flex flex-col gap-3 text-[15px] leading-normal">
            <PreviewBlock label={due ? t("homeworkDue", { date: due }) : t("homework")} text={r.homework} empty={t("notFilled")} />
            <PreviewBlock label={t("nextRecommendation")} text={r.recommendation} empty={t("notFilled")} />
            <PreviewBlock label={t("wentWell")} text={r.strengths} empty={t("notFilled")} />
            <PreviewBlock label={t("keepWorking")} text={r.development} empty={t("notFilled")} />
          </div>
        </div>
        <p className="flex items-start gap-2 px-1 text-[13px] text-muted">
          <Icon name="star" size={16} className="mt-0.5 shrink-0 text-orange-dark" />
          {t("reviewNote", { name: first })}
        </p>
      </aside>
    </div>
  );
}

function PreviewBlock({ label, text, empty }: { label: string; text: string; empty: string }) {
  return (
    <div className="rounded-[14px] bg-white/8 px-4 py-3.5">
      <strong className="block text-[13px] text-yellow uppercase">{label}</strong>
      <span className={cn(!text.trim() && "text-ink-soft italic")}>{text.trim() || empty}</span>
    </div>
  );
}
