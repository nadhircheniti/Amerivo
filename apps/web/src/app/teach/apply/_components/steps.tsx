"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { ChoiceTile, Field, Input, Segmented, Select } from "@/components/ui/form";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { formatUsd, PLATFORM_COMMISSION, teacherNet } from "@/lib/mock-data";
import {
  countries,
  educationLevels,
  experienceLevels,
  genders,
  groups,
  idTypes,
  interviewSlots,
  steps,
  subjects,
  timeZones,
  type Application,
} from "../_data";
import { SectionTitle, TagInput, UploadButton } from "./fields";

type StepProps = { app: Application; update: (patch: Partial<Application>) => void };

const toggle = <T extends string>(list: T[], v: T, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));

/** Whole-dollar price in the reader's number format (e.g. "$35", "35 $US"). */
const wholeUsd = (n: number, locale: Locale) => n.toLocaleString(intlTags[locale], { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Country name in the reader's language ("other" has its own label). */
function useCountryName() {
  const locale = useLocale() as Locale;
  const t = useTranslations("apply.options");
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([intlTags[locale]], { type: "region" });
  } catch {
    names = null;
  }
  return (code: (typeof countries)[number]) => (code === "other" ? t("countryOther") : (names?.of(code) ?? code));
}

/* ---------------- 1 · Personal info ---------------- */
export function PersonalStep({ app, update }: StepProps) {
  const t = useTranslations("apply.personal");
  const to = useTranslations("apply.options");
  const countryName = useCountryName();
  return (
    <>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-beige text-muted" aria-hidden="true">
          {app.photo.length ? <Icon name="check" size={32} strokeWidth={2.4} className="text-teal-dark" /> : <Icon name="user" size={40} />}
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t("photo")}</p>
          <p className="text-[13px] text-muted">{t("photoHint")}</p>
          <UploadButton label={app.photo.length ? t("replacePhoto") : t("uploadPhoto")} accept="image/jpeg,image/png" files={app.photo} onFiles={(photo) => update({ photo })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("firstName")}>
          <Input required autoComplete="given-name" value={app.firstName} onChange={(e) => update({ firstName: e.target.value })} />
        </Field>
        <Field label={t("lastName")}>
          <Input required autoComplete="family-name" value={app.lastName} onChange={(e) => update({ lastName: e.target.value })} />
        </Field>
        <Field label={t("email")}>
          <Input required type="email" autoComplete="email" value={app.email} onChange={(e) => update({ email: e.target.value })} />
        </Field>
        <Field label={t("phone")}>
          <Input type="tel" autoComplete="tel" placeholder="+1 (555) 000-0000" value={app.phone} onChange={(e) => update({ phone: e.target.value })} />
        </Field>
        <Field label={t("country")}>
          <Select required value={app.country} onChange={(e) => update({ country: e.target.value as Application["country"] })}>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryName(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("timeZone")} hint={t("timeZoneHint")}>
          <Select value={app.timeZone} onChange={(e) => update({ timeZone: e.target.value })}>
            {timeZones.map((z) => (
              <option key={z.value} value={z.value}>
                {to(`timeZones.${z.key}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="flex flex-wrap gap-2.5">
        <SectionTitle>{t("gender")}</SectionTitle>
        {genders.map((g) => (
          <ChoiceTile key={g} type="radio" name="gender" shape="pill" checked={app.gender === g} onChange={() => update({ gender: g })}>
            {to(`genders.${g}`)}
          </ChoiceTile>
        ))}
        <p className="w-full text-[13px] text-muted">{t("genderHint")}</p>
      </fieldset>
    </>
  );
}

/* ---------------- 2 · Professional info ---------------- */
export function ProfessionalStep({ app, update }: StepProps) {
  const t = useTranslations("apply.professional");
  const to = useTranslations("apply.options");
  const locale = useLocale() as Locale;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("education")}>
          <Select value={app.education} onChange={(e) => update({ education: e.target.value as Application["education"] })}>
            {educationLevels.map((o) => (
              <option key={o} value={o}>
                {to(`education.${o}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("experience")}>
          <Select value={app.experience} onChange={(e) => update({ experience: e.target.value as Application["experience"] })}>
            {experienceLevels.map((o) => (
              <option key={o} value={o}>
                {to(`experience.${o}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset>
        <SectionTitle>{t("subjects")}</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => (
            <ChoiceTile key={s} checked={app.subjects.includes(s)} onChange={(on) => update({ subjects: toggle(app.subjects, s, on) })}>
              {to(`subjects.${s}`)}
            </ChoiceTile>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-wrap gap-2.5">
        <SectionTitle>{t("groups")}</SectionTitle>
        {groups.map((g) => (
          <ChoiceTile key={g} shape="pill" checked={app.groups.includes(g)} onChange={(on) => update({ groups: toggle(app.groups, g, on) })}>
            {to(`groups.${g}`)}
          </ChoiceTile>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <TagInput label={t("certifications")} values={app.certifications} onChange={(certifications) => update({ certifications })} />
          <UploadButton
            label={t("uploadCertificates")}
            accept="application/pdf,image/jpeg"
            multiple
            files={app.certificateFiles}
            onFiles={(certificateFiles) => update({ certificateFiles })}
          />
        </div>
        <TagInput label={t("languages")} tone="orange" placeholder={t("languagesPlaceholder")} values={app.languages} onChange={(languages) => update({ languages })} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="rate" className="text-sm font-semibold">
            {t("rate")}
          </label>
          <span className="font-display text-xl font-extrabold" aria-hidden="true">
            {wholeUsd(app.rate, locale)}
          </span>
        </div>
        <input
          id="rate"
          type="range"
          min={20}
          max={50}
          step={1}
          value={app.rate}
          aria-valuetext={t("rateValue", { price: wholeUsd(app.rate, locale) })}
          aria-describedby="rate-net"
          onChange={(e) => update({ rate: Number(e.target.value) })}
        />
        <div className="flex justify-between gap-3 text-[13px] text-muted">
          <span aria-hidden="true">{wholeUsd(20, locale)}</span>
          <span id="rate-net" className="text-center" aria-live="polite">
            {t("net", { net: formatUsd(teacherNet(app.rate), locale), commission: PLATFORM_COMMISSION * 100 })}
          </span>
          <span aria-hidden="true">{wholeUsd(50, locale)}</span>
        </div>
      </div>

      <ChoiceTile checked={app.offersTrial} onChange={(on) => update({ offersTrial: on })}>
        <span className="flex flex-col">
          <span>{t("trial")}</span>
          <span className="text-[13px] font-normal text-muted">{t("trialHint")}</span>
        </span>
      </ChoiceTile>
    </>
  );
}

/** Right-column previews of steps 3 and 4 (shown next to step 2 on wide screens, as in the design). */
export function StepPreviews() {
  const t = useTranslations("apply.previews");
  return (
    <aside aria-label={t("label")} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6">
        <span className="text-xs font-semibold tracking-[2px] text-muted">{t("step3")}</span>
        <h3 className="text-[17px] font-bold">{t("identityTitle")}</h3>
        <p className="text-sm leading-normal text-navy-soft">{t("identityText")}</p>
        <div className="flex h-[90px] items-center justify-center rounded-[14px] border border-dashed border-line text-[13px] text-muted">{t("identityUpload")}</div>
      </div>
      <div className="flex flex-col gap-3 rounded-3xl bg-navy p-6 text-white">
        <span className="text-xs font-semibold tracking-[2px] text-yellow">{t("step4")}</span>
        <h3 className="text-[17px] font-bold text-white">{t("videoTitle")}</h3>
        <p className="text-sm leading-normal text-ink-soft">{t("videoText")}</p>
      </div>
    </aside>
  );
}

/* ---------------- 3 · Identity verification ---------------- */
export function IdentityStep({ app, update }: StepProps) {
  const t = useTranslations("apply.identity");
  const to = useTranslations("apply.options");
  return (
    <>
      <p className="text-[15px] leading-relaxed text-navy-soft">
        {t("intro")}
      </p>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold">{t("documentType")}</span>
        <Segmented label={t("documentType")} options={idTypes.map((id) => ({ value: id, label: to(`idTypes.${id}`) }))} value={app.idType} onChange={(idType) => update({ idType })} className="max-w-[560px] flex-wrap" />
      </div>

      <UploadButton
        variant="tile"
        icon="shieldCheck"
        label={t(`upload.${app.idType}`)}
        hint={t("uploadHint")}
        accept="image/jpeg,image/png,application/pdf"
        multiple
        files={app.idFiles}
        onFiles={(idFiles) => update({ idFiles })}
      />
      {/* TODO(stripe): replace the upload tile with a Stripe Identity VerificationSession (client secret from apps/api). */}

      <div className="flex items-start gap-3 rounded-2xl bg-teal-50 p-4 text-sm leading-normal">
        <Icon name="lock" size={20} className="mt-0.5 shrink-0 text-teal-dark" />
        <p>{t.rich("secure", { strong: (c) => <strong className="font-semibold">{c}</strong> })}</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-beige p-4 text-sm leading-normal">
        <Icon name="file" size={20} className="mt-0.5 shrink-0 text-navy" />
        <div className="flex flex-col gap-1">
          <strong className="font-semibold">{t("taxTitle")}</strong>
          <p className="text-navy-soft">{t("taxText")}</p>
        </div>
      </div>
    </>
  );
}

/* ---------------- 4 · Video introduction ---------------- */
const videoTopics = ["background", "experience", "style"] as const;

export function VideoStep({ app, update }: StepProps) {
  const t = useTranslations("apply.video");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const secondsRef = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      const next = Math.min(secondsRef.current + 1, 120);
      secondsRef.current = next;
      setSeconds(next);
      if (next >= 120) {
        setRecording(false);
        update({ video: [t("browserRecording", { duration: "2:00" })] });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording, update, t]);

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  function toggleRecording() {
    // TODO(media): use getUserMedia + MediaRecorder and upload the clip; this is a UI placeholder.
    if (recording) {
      setRecording(false);
      update({ video: [t("browserRecording", { duration: mmss })] });
    } else {
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
    }
  }

  return (
    <>
      <p className="text-[15px] leading-relaxed text-navy-soft">{t("intro")}</p>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[20px] bg-navy text-white">
          <div className="pointer-events-none absolute -top-16 -end-16 size-56 rounded-full bg-teal opacity-15" aria-hidden="true" />
          <div className="flex flex-col items-center gap-3 text-center">
            {app.video.length && !recording ? (
              <>
                <span className="flex size-16 items-center justify-center rounded-full bg-teal-dark">
                  <Icon name="check" size={28} strokeWidth={2.4} />
                </span>
                <span className="text-sm text-ink-soft">{app.video[0]}</span>
              </>
            ) : (
              <>
                <span className="flex size-16 items-center justify-center rounded-full bg-white/12">
                  <Icon name="video" size={28} />
                </span>
                <span className="font-display text-2xl font-bold tabular-nums" role="timer" aria-label={t("recordingTime")}>
                  {mmss} <span className="text-base font-medium text-ink-soft">/ 2:00</span>
                </span>
              </>
            )}
          </div>
          {recording && (
            <span className="absolute start-4 top-4 flex items-center gap-2 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white" role="status">
              <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden="true" />
              {t("recording")}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={toggleRecording}
            aria-pressed={recording}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-orange font-bold text-navy hover:bg-[#ffa64d]"
          >
            <span className={recording ? "size-3 rounded-sm bg-danger" : "size-3 rounded-full bg-danger"} aria-hidden="true" />
            {recording ? t("stop") : app.video.length ? t("again") : t("record")}
          </button>
          <UploadButton label={t("upload")} accept="video/mp4,video/quicktime,video/webm" icon="video" files={[]} onFiles={(video) => update({ video })} />
          <p className="text-[13px] text-muted">{t("formats")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[15px] font-bold">{t("whatToCover")}</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {videoTopics.map((k, i) => (
            <li key={k} className="flex flex-col gap-1 rounded-2xl bg-beige p-4">
              <span className="font-display text-sm font-bold">{t("topic", { number: i + 1, title: t(`topics.${k}.title`) })}</span>
              <span className="text-[13px] leading-normal text-navy-soft">{t(`topics.${k}.text`)}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

/* ---------------- 5 · Review & interview ---------------- */
export function ReviewStep({ app, update, onEdit }: StepProps & { onEdit: (step: number) => void }) {
  const t = useTranslations("apply.review");
  const to = useTranslations("apply.options");
  const ts = useTranslations("apply.steps");
  const locale = useLocale() as Locale;
  const countryName = useCountryName();
  const list = (items: string[]) => new Intl.ListFormat(intlTags[locale], { style: "long", type: "conjunction" }).format(items);
  const zone = timeZones.find((z) => z.value === app.timeZone);
  const tz = zone ? to(`timeZones.${zone.key}`) : app.timeZone;
  const dash = <span className="text-muted">{t("notProvided")}</span>;

  return (
    <>
      <div className="flex flex-col gap-4">
        <ReviewCard title={ts(`${steps[0].id}.title`)} onEdit={() => onEdit(0)}>
          <Row label={t("name")}>{`${app.firstName} ${app.lastName}`.trim() || dash}</Row>
          <Row label={t("email")}>{app.email || dash}</Row>
          <Row label={t("phone")}>{app.phone || dash}</Row>
          <Row label={t("country")}>{countryName(app.country)}</Row>
          <Row label={t("gender")}>{app.gender ? to(`genders.${app.gender}`) : dash}</Row>
          <Row label={t("timeZone")}>{tz}</Row>
          <Row label={t("photo")}>{app.photo[0] ?? dash}</Row>
        </ReviewCard>
        <ReviewCard title={ts(`${steps[1].id}.title`)} onEdit={() => onEdit(1)}>
          <Row label={t("education")}>{to(`education.${app.education}`)}</Row>
          <Row label={t("experience")}>{to(`experience.${app.experience}`)}</Row>
          <Row label={t("teaches")}>{list(app.subjects.map((s) => to(`subjects.${s}`))) || dash}</Row>
          <Row label={t("groups")}>{list(app.groups.map((g) => to(`groups.${g}`))) || dash}</Row>
          <Row label={t("certifications")}>{list(app.certifications) || dash}</Row>
          <Row label={t("languages")}>{list(app.languages) || dash}</Row>
          <Row label={t("rate")}>
            {t("rateValue", { price: wholeUsd(app.rate, locale), net: formatUsd(teacherNet(app.rate), locale), trial: app.offersTrial ? "on" : "off" })}
          </Row>
        </ReviewCard>
        <ReviewCard title={ts(`${steps[2].id}.title`)} onEdit={() => onEdit(2)}>
          <Row label={t("document")}>{app.idFiles.length ? t("documentValue", { type: to(`idTypes.${app.idType}`), count: app.idFiles.length }) : dash}</Row>
          <Row label={t("w9")}>{t("w9Value")}</Row>
        </ReviewCard>
        <ReviewCard title={ts(`${steps[3].id}.title`)} onEdit={() => onEdit(3)}>
          <Row label={t("video")}>{app.video[0] ?? dash}</Row>
        </ReviewCard>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-cream p-5">
        <div className="flex items-start gap-3">
          <Icon name="video" size={20} className="mt-0.5 shrink-0 text-orange-dark" />
          <div className="flex flex-col gap-1 text-sm leading-normal">
            <strong className="font-semibold">{t("interviewTitle")}</strong>
            <p className="text-orange-text">{t("interviewText")}</p>
          </div>
        </div>
        <Field label={t("interviewTime")} className="max-w-[320px]">
          <Select value={app.interviewSlot} onChange={(e) => update({ interviewSlot: e.target.value as Application["interviewSlot"] })}>
            {interviewSlots.map((s) => (
              <option key={s} value={s}>
                {to(`interviewSlots.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-start gap-3 text-sm leading-normal">
        <input type="checkbox" required className="mt-0.5 size-[18px] shrink-0" />
        <span>{t("confirm")}</span>
      </label>
    </>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const t = useTranslations("apply.review");
  return (
    <section className="rounded-2xl border border-line-soft p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">{title}</h2>
        <button type="button" onClick={onEdit} aria-label={t("editSection", { section: title })} className="text-sm font-semibold text-teal-dark hover:text-navy">
          {t("edit")}
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="mb-1 break-words sm:mb-0">{children}</dd>
    </>
  );
}

/* ---------------- 6 · Approval ---------------- */
const statuses: { id: "pending" | "approved" | "rejected" | "suspended"; tone: BadgeTone }[] = [
  { id: "pending", tone: "warning" },
  { id: "approved", tone: "success" },
  { id: "rejected", tone: "danger" },
  { id: "suspended", tone: "neutral" },
];

export function ApprovalStep({ app }: { app: Application }) {
  const t = useTranslations("apply.approval");
  return (
    <>
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-orange-100 p-6 sm:flex-row sm:items-center" role="status">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-orange-dark">
          <Icon name="clock" size={28} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="font-display text-lg font-bold">{t("submitted")}</strong>
            <Badge tone="warning">{t("pendingReview")}</Badge>
          </span>
          <p className="text-sm leading-normal text-orange-text">
            {app.firstName ? t("thanksName", { name: app.firstName }) : t("thanks")} {app.email ? t("emailTo", { email: app.email }) : t("emailYou")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[15px] font-bold">{t("statusTitle")}</h2>
        <ul className="flex flex-col gap-2.5">
          {statuses.map((s, i) => (
            <li key={s.id} className={i === 0 ? "flex flex-col gap-2 rounded-2xl border-2 border-orange p-4 sm:flex-row sm:items-center sm:gap-4" : "flex flex-col gap-2 rounded-2xl border border-line-soft p-4 sm:flex-row sm:items-center sm:gap-4"}>
              <Badge tone={s.tone} className="w-fit shrink-0 sm:w-[96px] sm:justify-center">
                {t(`statuses.${s.id}.label`)}
              </Badge>
              <span className="text-sm leading-normal text-navy-soft">
                {t(`statuses.${s.id}.text`)}
                {i === 0 && <span className="sr-only"> {t("current")}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
