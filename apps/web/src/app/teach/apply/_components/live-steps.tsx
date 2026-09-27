"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { videoEmbedUrl, type Application, type IdentityStatus, type TeacherStatus } from "../_data";
import { useLive } from "./live-context";

type StepProps = { app: Application; update: (patch: Partial<Application>) => void };

export const identityTones: Record<IdentityStatus, BadgeTone> = { not_started: "neutral", pending: "warning", verified: "success", failed: "danger" };
/** Message keys for identity statuses ("not_started" → "notStarted"). */
export const identityKey = (s: IdentityStatus) => (s === "not_started" ? "notStarted" : s);

/* ---------------- 3 · Identity verification with Stripe Identity ---------------- */
export function LiveIdentity() {
  const t = useTranslations("apply.identity");
  const live = useLive()!;
  const status = live.profile.identityStatus;
  const [busy, setBusy] = useState<"start" | "sync" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  async function start() {
    setBusy("start");
    setError(null);
    try {
      const { url } = await live.call<{ url: string }>("/teacher/identity/session", { method: "POST" });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("stripeError"));
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setError(null);
    setChecked(false);
    try {
      const r = await live.call<{ identityStatus: IdentityStatus; reason?: string }>("/teacher/identity/sync", { method: "POST" });
      live.setProfile((p) => ({ ...p, identityStatus: r.identityStatus }));
      live.setIdentityReason(r.reason ?? null);
      setChecked(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("stripeError"));
    } finally {
      setBusy(null);
    }
  }

  const key = identityKey(status);
  return (
    <>
      <p className="text-[15px] leading-relaxed text-navy-soft">{t("liveIntro")}</p>

      <div className="flex flex-col gap-4 rounded-2xl border border-line-soft p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">{t("statusLabel")}</span>
          <Badge tone={identityTones[status]}>
            <Icon name={status === "verified" ? "check" : status === "failed" ? "x" : status === "pending" ? "clock" : "shield"} size={14} strokeWidth={2.2} />
            {t(`status.${key}.label`)}
          </Badge>
        </div>
        <p className="text-sm leading-normal text-navy-soft">{t(`status.${key}.text`)}</p>
        {status === "failed" && live.identityReason && (
          <p className="rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger-text">{t("failedReason", { reason: live.identityReason })}</p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {(status === "not_started" || status === "failed") && (
            <Button variant="teal" onClick={() => void start()} disabled={busy !== null}>
              <Icon name="shieldCheck" size={18} />
              {busy === "start" ? t("redirecting") : status === "failed" ? t("retry") : t("start")}
            </Button>
          )}
          {status !== "verified" && (
            <Button variant="outline" onClick={() => void sync()} disabled={busy !== null}>
              <Icon name="repeat" size={16} />
              {busy === "sync" ? t("checking") : t("checkAgain")}
            </Button>
          )}
        </div>
        <p role="status" className="text-sm text-teal-deep">
          {checked && status !== "failed" ? t("checked") : ""}
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {(["document", "selfie", "time"] as const).map((k) => (
          <li key={k} className="flex flex-col gap-1 rounded-2xl bg-beige p-4">
            <strong className="font-display text-sm font-bold">{t(`how.${k}.title`)}</strong>
            <span className="text-[13px] leading-normal text-navy-soft">{t(`how.${k}.text`)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------- 4 · Video introduction (link) ---------------- */
const tipIds = ["say", "light", "quiet", "share"] as const;

export function LiveVideo({ app, update }: StepProps) {
  const t = useTranslations("apply.video");
  const embed = videoEmbedUrl(app.videoUrl);
  return (
    <>
      <p className="text-[15px] leading-relaxed text-navy-soft">{t("liveIntro")}</p>

      <Field label={t("urlLabel")} hint={t("urlHint")}>
        <Input
          type="url"
          inputMode="url"
          required
          pattern="https://.+"
          title={t("urlPattern")}
          placeholder="https://youtu.be/…"
          value={app.videoUrl}
          onChange={(e) => update({ videoUrl: e.target.value })}
          dir="ltr"
        />
      </Field>

      {embed ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t("preview")}</span>
          <div className="aspect-video w-full max-w-[720px] overflow-hidden rounded-[20px] bg-navy">
            <iframe
              key={embed}
              src={embed}
              title={t("previewTitle")}
              className="size-full border-0"
              loading="lazy"
              allow="fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : (
        app.videoUrl.trim() && <p className="rounded-2xl bg-beige p-4 text-sm leading-normal text-navy-soft">{t("noPreview")}</p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[15px] font-bold">{t("tipsTitle")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {tipIds.map((k) => (
            <li key={k} className="flex items-start gap-3 rounded-2xl bg-beige p-4">
              <Icon name="check" size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-teal-dark" />
              <span className="flex flex-col gap-0.5">
                <strong className="text-sm font-semibold">{t(`tips.${k}.title`)}</strong>
                <span className="text-[13px] leading-normal text-navy-soft">{t(`tips.${k}.text`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* ---------------- 6 · Approval: statuses ---------------- */
const statuses: { id: Exclude<TeacherStatus, "draft">; tone: BadgeTone }[] = [
  { id: "pending", tone: "warning" },
  { id: "approved", tone: "success" },
  { id: "rejected", tone: "danger" },
  { id: "suspended", tone: "neutral" },
];

/** "What each status means", the applicant's current status highlighted. */
export function StatusList({ current }: { current: TeacherStatus }) {
  const t = useTranslations("apply.approval");
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-[15px] font-bold">{t("statusTitle")}</h2>
      <ul className="flex flex-col gap-2.5">
        {statuses.map((s) => (
          <li
            key={s.id}
            className={cn("flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-4", s.id === current ? "border-2 border-orange" : "border border-line-soft")}
          >
            <Badge tone={s.tone} className="w-fit shrink-0 sm:w-[96px] sm:justify-center">
              {t(`statuses.${s.id}.label`)}
            </Badge>
            <span className="text-sm leading-normal text-navy-soft">
              {t(`statuses.${s.id}.text`)}
              {s.id === current && <span className="sr-only"> {t("current")}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Real status of a submitted application (GET /teacher/profile). */
export function LiveApproval({ onEdit }: { onEdit: () => void }) {
  const t = useTranslations("apply.approval");
  const locale = useLocale() as Locale;
  const { profile } = useLive()!;
  const review = profile.review;
  const notes = review?.adminNotes?.trim();
  const date = (iso: string) => new Intl.DateTimeFormat(intlTags[locale], { dateStyle: "long" }).format(new Date(iso));
  const notesBlock = (title: string) =>
    notes ? (
      <div className="flex flex-col gap-1 rounded-xl bg-white/70 p-4 text-sm leading-normal">
        <strong className="font-semibold">{title}</strong>
        {/* Written by the Amerivo team: shown as-is. */}
        <p className="whitespace-pre-line text-navy">{notes}</p>
      </div>
    ) : null;

  return (
    <>
      {profile.status === "pending" && (
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
                {profile.firstName ? t("thanksName", { name: profile.firstName }) : t("thanks")} {profile.email ? t("liveEmailTo", { email: profile.email }) : t("liveEmailYou")}
              </p>
            </div>
          </div>
          {review?.interviewRequestedAt && (
            <div className="flex flex-col gap-3 rounded-2xl bg-teal-50 p-6">
              <span className="flex items-center gap-3">
                <Icon name="video" size={22} className="shrink-0 text-teal-dark" />
                <strong className="font-display text-lg font-bold">{t("interviewTitle")}</strong>
              </span>
              <p className="text-sm leading-normal text-navy-soft">{t("interviewText", { date: date(review.interviewRequestedAt) })}</p>
              {notesBlock(t("interviewNotes"))}
            </div>
          )}
        </>
      )}

      {profile.status === "approved" && (
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-teal-50 p-6" role="status">
          <span className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-teal-dark">
              <Icon name="check" size={28} strokeWidth={2.4} />
            </span>
            <span className="flex flex-col gap-1">
              <strong className="font-display text-lg font-bold">{profile.firstName ? t("approvedTitleName", { name: profile.firstName }) : t("approvedTitle")}</strong>
              <span className="text-sm leading-normal text-navy-soft">{t("approvedText")}</span>
            </span>
          </span>
          <p className="flex items-start gap-2 text-sm leading-normal text-navy-soft">
            <Icon name="calendar" size={16} className="mt-0.5 shrink-0 text-teal-dark" />
            {t("availabilityHint")}
          </p>
          <ButtonLink href="/teacher" variant="teal">
            {t("goDashboard")}
            <Icon name="arrowRight" size={18} strokeWidth={2} />
          </ButtonLink>
        </div>
      )}

      {profile.status === "rejected" && (
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-danger-100 p-6" role="status">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="font-display text-lg font-bold">{t("rejectedTitle")}</strong>
            <Badge tone="danger">{t("statuses.rejected.label")}</Badge>
          </span>
          <p className="text-sm leading-normal text-navy-soft">{t("rejectedText")}</p>
          {notesBlock(t("reviewerNotes"))}
          <Button variant="teal" onClick={onEdit}>
            {t("editResubmit")}
          </Button>
        </div>
      )}

      {profile.status === "suspended" && (
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-beige p-6" role="status">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="font-display text-lg font-bold">{t("suspendedTitle")}</strong>
            <Badge tone="neutral">{t("statuses.suspended.label")}</Badge>
          </span>
          <p className="text-sm leading-normal text-navy-soft">{t("suspendedText")}</p>
          {notesBlock(t("reviewerNotes"))}
          <ButtonLink href="mailto:support@amerivo.example" variant="outline">
            {t("contactSupport")}
          </ButtonLink>
        </div>
      )}

      <StatusList current={profile.status} />
    </>
  );
}
