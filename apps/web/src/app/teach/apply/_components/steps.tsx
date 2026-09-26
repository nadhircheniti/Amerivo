"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { ChoiceTile, Field, Input, Segmented, Select } from "@/components/ui/form";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
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

const toggle = (list: string[], v: string, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));

/* ---------------- 1 · Personal info ---------------- */
export function PersonalStep({ app, update }: StepProps) {
  return (
    <>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-beige text-muted" aria-hidden="true">
          {app.photo.length ? <Icon name="check" size={32} strokeWidth={2.4} className="text-teal-dark" /> : <Icon name="user" size={40} />}
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Profile photo</p>
          <p className="text-[13px] text-muted">A friendly, well-lit headshot. Students see it on your profile and in search results.</p>
          <UploadButton label={app.photo.length ? "Replace photo" : "Upload photo (JPG, PNG)"} accept="image/jpeg,image/png" files={app.photo} onFiles={(photo) => update({ photo })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input required autoComplete="given-name" value={app.firstName} onChange={(e) => update({ firstName: e.target.value })} />
        </Field>
        <Field label="Last name">
          <Input required autoComplete="family-name" value={app.lastName} onChange={(e) => update({ lastName: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input required type="email" autoComplete="email" value={app.email} onChange={(e) => update({ email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input type="tel" autoComplete="tel" placeholder="+1 (555) 000-0000" value={app.phone} onChange={(e) => update({ phone: e.target.value })} />
        </Field>
        <Field label="Country of residence">
          <Select required value={app.country} onChange={(e) => update({ country: e.target.value })}>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Time zone" hint="Used to show your availability to students in their local time.">
          <Select value={app.timeZone} onChange={(e) => update({ timeZone: e.target.value })}>
            {timeZones.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="flex flex-wrap gap-2.5">
        <SectionTitle>Gender</SectionTitle>
        {genders.map((g) => (
          <ChoiceTile key={g} type="radio" name="gender" shape="pill" checked={app.gender === g} onChange={() => update({ gender: g })}>
            {g}
          </ChoiceTile>
        ))}
        <p className="w-full text-[13px] text-muted">Some students filter by a preferred teacher gender. You can change this later.</p>
      </fieldset>
    </>
  );
}

/* ---------------- 2 · Professional info ---------------- */
export function ProfessionalStep({ app, update }: StepProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Highest education">
          <Select value={app.education} onChange={(e) => update({ education: e.target.value })}>
            {educationLevels.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>
        <Field label="Years of teaching experience">
          <Select value={app.experience} onChange={(e) => update({ experience: e.target.value })}>
            {experienceLevels.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset>
        <SectionTitle>What can you teach?</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => (
            <ChoiceTile key={s} checked={app.subjects.includes(s)} onChange={(on) => update({ subjects: toggle(app.subjects, s, on) })}>
              {s}
            </ChoiceTile>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-wrap gap-2.5">
        <SectionTitle>Groups you can teach</SectionTitle>
        {groups.map((g) => (
          <ChoiceTile key={g} shape="pill" checked={app.groups.includes(g)} onChange={(on) => update({ groups: toggle(app.groups, g, on) })}>
            {g}
          </ChoiceTile>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <TagInput label="Certifications" values={app.certifications} onChange={(certifications) => update({ certifications })} />
          <UploadButton
            label="Upload certificates (PDF, JPG)"
            accept="application/pdf,image/jpeg"
            multiple
            files={app.certificateFiles}
            onFiles={(certificateFiles) => update({ certificateFiles })}
          />
        </div>
        <TagInput label="Spoken languages" tone="orange" placeholder="e.g. French · B1" values={app.languages} onChange={(languages) => update({ languages })} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="rate" className="text-sm font-semibold">
            Your rate per 50-min lesson
          </label>
          <span className="font-display text-xl font-extrabold" aria-hidden="true">
            ${app.rate}
          </span>
        </div>
        <input
          id="rate"
          type="range"
          min={20}
          max={50}
          step={1}
          value={app.rate}
          aria-valuetext={`$${app.rate} per lesson`}
          aria-describedby="rate-net"
          onChange={(e) => update({ rate: Number(e.target.value) })}
        />
        <div className="flex justify-between gap-3 text-[13px] text-muted">
          <span aria-hidden="true">$20</span>
          <span id="rate-net" className="text-center" aria-live="polite">
            You receive {formatUsd(teacherNet(app.rate))} after the {PLATFORM_COMMISSION * 100}% platform commission
          </span>
          <span aria-hidden="true">$50</span>
        </div>
      </div>

      <ChoiceTile checked={app.offersTrial} onChange={(on) => update({ offersTrial: on })}>
        <span className="flex flex-col">
          <span>Offer a free 20-minute trial lesson</span>
          <span className="text-[13px] font-normal text-muted">Students can meet you once before booking. You can change this later.</span>
        </span>
      </ChoiceTile>
    </>
  );
}

/** Right-column previews of steps 3 and 4 (shown next to step 2 on wide screens, as in the design). */
export function StepPreviews() {
  return (
    <aside aria-label="Coming up next" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6">
        <span className="text-xs font-semibold tracking-[2px] text-muted">STEP 3 · PREVIEW</span>
        <h3 className="text-[17px] font-bold">Identity verification</h3>
        <p className="text-sm leading-normal text-navy-soft">Government ID, passport or driver&apos;s license, plus a selfie. Handled securely by Stripe Identity.</p>
        <div className="flex h-[90px] items-center justify-center rounded-[14px] border border-dashed border-line text-[13px] text-muted">Upload ID document</div>
      </div>
      <div className="flex flex-col gap-3 rounded-3xl bg-navy p-6 text-white">
        <span className="text-xs font-semibold tracking-[2px] text-yellow">STEP 4 · PREVIEW</span>
        <h3 className="text-[17px] font-bold text-white">2-minute video introduction</h3>
        <p className="text-sm leading-normal text-ink-soft">Background · Experience · Teaching style. Students see it on your profile.</p>
      </div>
    </aside>
  );
}

/* ---------------- 3 · Identity verification ---------------- */
export function IdentityStep({ app, update }: StepProps) {
  return (
    <>
      <p className="text-[15px] leading-relaxed text-navy-soft">
        We verify every teacher before they can accept bookings. Upload a valid photo ID; you&apos;ll be asked for a quick selfie to match it.
      </p>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold">
          Document type
        </span>
        <Segmented label="Document type" options={idTypes.map((t) => ({ value: t.value, label: t.label }))} value={app.idType} onChange={(idType) => update({ idType })} className="max-w-[560px] flex-wrap" />
      </div>

      <UploadButton
        variant="tile"
        icon="shieldCheck"
        label={`Upload your ${idTypes.find((t) => t.value === app.idType)?.label.toLowerCase()}`}
        hint="Front and back if applicable · JPG, PNG or PDF"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        files={app.idFiles}
        onFiles={(idFiles) => update({ idFiles })}
      />
      {/* TODO(stripe): replace the upload tile with a Stripe Identity VerificationSession (client secret from apps/api). */}

      <div className="flex items-start gap-3 rounded-2xl bg-teal-50 p-4 text-sm leading-normal">
        <Icon name="lock" size={20} className="mt-0.5 shrink-0 text-teal-dark" />
        <p>
          <strong className="font-semibold">Handled securely by Stripe Identity.</strong> Amerivo never stores a copy of your ID document; we only receive the verification result.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-beige p-4 text-sm leading-normal">
        <Icon name="file" size={20} className="mt-0.5 shrink-0 text-navy" />
        <div className="flex flex-col gap-1">
          <strong className="font-semibold">Tax information (W-9)</strong>
          <p className="text-navy-soft">We collect your W-9; 1099 forms are issued automatically. You&apos;ll complete it when you connect your payout account.</p>
        </div>
      </div>
    </>
  );
}

/* ---------------- 4 · Video introduction ---------------- */
const videoTopics = [
  { title: "Background", text: "Where you're from in the U.S. and a little about you." },
  { title: "Experience", text: "Who you've taught and what results they got." },
  { title: "Teaching style", text: "What a lesson with you feels like." },
];

export function VideoStep({ app, update }: StepProps) {
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
        update({ video: ["Browser recording (2:00)"] });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording, update]);

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  function toggleRecording() {
    // TODO(media): use getUserMedia + MediaRecorder and upload the clip; this is a UI placeholder.
    if (recording) {
      setRecording(false);
      update({ video: [`Browser recording (${mmss})`] });
    } else {
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
    }
  }

  return (
    <>
      <p className="text-[15px] leading-relaxed text-navy-soft">Record a video of up to 2 minutes. Students watch it on your profile before booking, so speak naturally and look at the camera.</p>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[20px] bg-navy text-white">
          <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-teal opacity-15" aria-hidden="true" />
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
                <span className="font-display text-2xl font-bold tabular-nums" role="timer" aria-label="Recording time">
                  {mmss} <span className="text-base font-medium text-ink-soft">/ 2:00</span>
                </span>
              </>
            )}
          </div>
          {recording && (
            <span className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white" role="status">
              <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden="true" />
              Recording
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
            {recording ? "Stop recording" : app.video.length ? "Record again" : "Record in browser"}
          </button>
          <UploadButton label="Upload a video file" accept="video/mp4,video/quicktime,video/webm" icon="video" files={[]} onFiles={(video) => update({ video })} />
          <p className="text-[13px] text-muted">MP4, MOV or WebM · max 2 minutes</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[15px] font-bold">What to cover</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {videoTopics.map((t, i) => (
            <li key={t.title} className="flex flex-col gap-1 rounded-2xl bg-beige p-4">
              <span className="font-display text-sm font-bold">
                {i + 1}. {t.title}
              </span>
              <span className="text-[13px] leading-normal text-navy-soft">{t.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

/* ---------------- 5 · Review & interview ---------------- */
export function ReviewStep({ app, update, onEdit }: StepProps & { onEdit: (step: number) => void }) {
  const tz = timeZones.find((t) => t.value === app.timeZone)?.label ?? app.timeZone;
  const idLabel = idTypes.find((t) => t.value === app.idType)?.label ?? "";
  const dash = <span className="text-muted">Not provided</span>;

  return (
    <>
      <div className="flex flex-col gap-4">
        <ReviewCard title={steps[0].title} onEdit={() => onEdit(0)}>
          <Row label="Name">{`${app.firstName} ${app.lastName}`.trim() || dash}</Row>
          <Row label="Email">{app.email || dash}</Row>
          <Row label="Phone">{app.phone || dash}</Row>
          <Row label="Country">{app.country}</Row>
          <Row label="Gender">{app.gender || dash}</Row>
          <Row label="Time zone">{tz}</Row>
          <Row label="Photo">{app.photo[0] ?? dash}</Row>
        </ReviewCard>
        <ReviewCard title={steps[1].title} onEdit={() => onEdit(1)}>
          <Row label="Education">{app.education}</Row>
          <Row label="Experience">{app.experience}</Row>
          <Row label="Teaches">{app.subjects.join(", ") || dash}</Row>
          <Row label="Groups">{app.groups.join(", ") || dash}</Row>
          <Row label="Certifications">{app.certifications.join(", ") || dash}</Row>
          <Row label="Languages">{app.languages.join(", ") || dash}</Row>
          <Row label="Rate">
            ${app.rate} per lesson · you receive {formatUsd(teacherNet(app.rate))} · free trial {app.offersTrial ? "on" : "off"}
          </Row>
        </ReviewCard>
        <ReviewCard title={steps[2].title} onEdit={() => onEdit(2)}>
          <Row label="Document">{app.idFiles.length ? `${idLabel} · ${app.idFiles.length} file(s)` : dash}</Row>
          <Row label="W-9">Collected when you connect payouts</Row>
        </ReviewCard>
        <ReviewCard title={steps[3].title} onEdit={() => onEdit(3)}>
          <Row label="Video">{app.video[0] ?? dash}</Row>
        </ReviewCard>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-cream p-5">
        <div className="flex items-start gap-3">
          <Icon name="video" size={20} className="mt-0.5 shrink-0 text-orange-dark" />
          <div className="flex flex-col gap-1 text-sm leading-normal">
            <strong className="font-semibold">Short interview</strong>
            <p className="text-orange-text">If your application passes review, we&apos;ll invite you to a 15-minute video interview with our teaching team.</p>
          </div>
        </div>
        <Field label="Preferred interview time" className="max-w-[320px]">
          <Select value={app.interviewSlot} onChange={(e) => update({ interviewSlot: e.target.value })}>
            {interviewSlots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-start gap-3 text-sm leading-normal">
        <input type="checkbox" required className="mt-0.5 size-[18px] shrink-0" />
        <span>I confirm that I am a U.S. native English speaker and that the information in this application is accurate.</span>
      </label>
    </>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line-soft p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">{title}</h2>
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-teal-dark hover:text-navy">
          Edit<span className="sr-only"> {title.toLowerCase()}</span>
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
const statuses: { label: string; tone: BadgeTone; text: string }[] = [
  { label: "Pending", tone: "warning", text: "We're reviewing your documents, video and interview. This usually takes 3–5 business days." },
  { label: "Approved", tone: "success", text: "Your profile goes live. Set your availability and connect Stripe to start accepting bookings." },
  { label: "Rejected", tone: "danger", text: "Your application didn't meet our requirements this time. We'll email you the reason." },
  { label: "Suspended", tone: "neutral", text: "An approved account can be paused if our teacher standards or terms aren't met." },
];

export function ApprovalStep({ app }: { app: Application }) {
  return (
    <>
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-orange-100 p-6 sm:flex-row sm:items-center" role="status">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-orange-dark">
          <Icon name="clock" size={28} />
        </span>
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="font-display text-lg font-bold">Application submitted</strong>
            <Badge tone="warning">Pending review</Badge>
          </span>
          <p className="text-sm leading-normal text-orange-text">
            Thanks{app.firstName ? `, ${app.firstName}` : ""}! We&apos;ll email {app.email || "you"} within 3–5 business days to schedule your interview.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[15px] font-bold">What each status means</h2>
        <ul className="flex flex-col gap-2.5">
          {statuses.map((s, i) => (
            <li key={s.label} className={i === 0 ? "flex flex-col gap-2 rounded-2xl border-2 border-orange p-4 sm:flex-row sm:items-center sm:gap-4" : "flex flex-col gap-2 rounded-2xl border border-line-soft p-4 sm:flex-row sm:items-center sm:gap-4"}>
              <Badge tone={s.tone} className="w-fit shrink-0 sm:w-[96px] sm:justify-center">
                {s.label}
              </Badge>
              <span className="text-sm leading-normal text-navy-soft">
                {s.text}
                {i === 0 && <span className="sr-only"> (your current status)</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
