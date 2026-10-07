"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TagInput } from "@/app/teach/apply/_components/fields";
import { videoEmbedUrl } from "@/lib/video";
import { Button } from "@/components/ui/button";
import { AvatarUpload, CertificateFiles, fileSrc } from "@/components/ui/file-upload";
import { ChoiceTile, Field, Input, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Avatar, Badge, Tag } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL, ApiError } from "@/lib/api";
import { currentTeacher } from "@/lib/mock-data";
import { useApi } from "@/lib/use-api";
import { LoadState, initialsOf, useLoad } from "../../_components/use-load";

/** Specialty names as stored by the API (labels in common.specialties). */
const SPECIALTIES = ["Business English", "Conversation", "General English", "Interview Prep", "IELTS Prep", "TOEFL Prep", "Travel", "Corporate", "Reading", "Grammar"];
const GROUPS = ["adults", "teens"] as const;

type Language = { language: string; level: string };
type Certification = { name: string; fileUrl?: string | null };
export type PublicProfile = {
  slug: string;
  status: "draft" | "pending" | "approved" | "rejected" | "suspended";
  firstName: string;
  lastName: string;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  teaches: ("adults" | "teens")[];
  languages: Language[];
  certifications: Certification[];
  introVideoUrl: string | null;
};

type Form = { headline: string; bio: string; specialties: string[]; teaches: string[]; languages: string[]; certifications: string[]; introVideoUrl: string };

const languageTag = (l: Language) => (l.level ? `${l.language} · ${l.level}` : l.language);
function parseLanguage(tag: string): Language {
  const parts = tag.split(/\s*[·•|]\s*/);
  if (parts.length > 1) return { language: parts[0].trim(), level: parts.slice(1).join(" ").trim() };
  const m = tag.trim().match(/^(.+?)\s+([ABC][12]|native|fluent)$/i);
  return m ? { language: m[1], level: m[2] } : { language: tag.trim(), level: "" };
}
const formOf = (p: PublicProfile): Form => ({
  headline: p.headline ?? "",
  bio: p.bio ?? "",
  specialties: p.specialties ?? [],
  teaches: p.teaches ?? [],
  languages: (p.languages ?? []).map(languageTag),
  certifications: (p.certifications ?? []).map((c) => c.name),
  introVideoUrl: p.introVideoUrl ?? "",
});

/** Live mode: GET /teacher/profile + GET /me (photo); saves with PUT /teacher/profile. */
export function LiveProfile() {
  const t = useTranslations("teacher.profile");
  const { call } = useApi();
  const profile = useLoad<PublicProfile>("/teacher/profile");
  const me = useLoad<{ avatarUrl: string | null }>("/me");
  if (!profile.data) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-10">
        <LoadState failed={profile.failed} onRetry={profile.retry} title={t("title")} />
      </div>
    );
  }
  const p = profile.data;
  return (
    <ProfileEditor
      profile={p}
      avatarUrl={me.data?.avatarUrl ?? null}
      avatarKnown={!!me.data}
      onSave={async (f) => {
        const kept = new Map((p.certifications ?? []).map((c) => [c.name, c]));
        const body = {
          headline: f.headline.trim(),
          bio: f.bio.trim(),
          specialties: f.specialties,
          teaches: f.teaches,
          languages: f.languages.map(parseLanguage).filter((l) => l.language),
          // Keep any file link already attached to a certification that is still listed.
          certifications: f.certifications.map((name) => {
            const c = kept.get(name);
            return c?.fileUrl ? { name, fileUrl: c.fileUrl } : { name };
          }),
          introVideoUrl: f.introVideoUrl.trim() || null,
        };
        await call("/teacher/profile", { method: "PUT", body: JSON.stringify(body) });
      }}
    />
  );
}

/** Demo mode: the sample teacher, nothing is saved. */
export function DemoProfile() {
  const [first, last] = currentTeacher.name.split(" ");
  const demo: PublicProfile = {
    slug: currentTeacher.slug,
    status: "approved",
    firstName: first,
    lastName: last ?? "",
    headline: currentTeacher.headline,
    bio: currentTeacher.summary,
    specialties: currentTeacher.specialties,
    teaches: currentTeacher.teaches.map((g) => g.toLowerCase() as "adults" | "teens"),
    languages: currentTeacher.languages.map((l) => {
      const m = l.match(/^(.+?) \((.+)\)$/);
      return m ? { language: m[1], level: m[2] } : { language: l, level: "" };
    }),
    certifications: currentTeacher.certifications.map((name) => ({ name })),
    introVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  };
  return <ProfileEditor profile={demo} avatarUrl={null} avatarKnown onSave={async () => undefined} />;
}

function ProfileEditor({ profile, avatarUrl, avatarKnown, onSave }: { profile: PublicProfile; avatarUrl: string | null; avatarKnown: boolean; onSave: (f: Form) => Promise<void> }) {
  const t = useTranslations("teacher.profile");
  const ts = useTranslations("common.specialties");
  const locale = useLocale() as Locale;
  const [f, setF] = useState<Form>(() => formOf(profile));
  // Newly uploaded photo, else the one loaded with the account.
  const [uploaded, setPhoto] = useState<string | null>(null);
  const photo = uploaded ?? avatarUrl;
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((cur) => ({ ...cur, [k]: v }));
    if (state === "saved") setState("idle");
  };
  const toggle = (k: "specialties" | "teaches", v: string, on: boolean) => set(k, on ? [...f[k], v] : f[k].filter((x) => x !== v));
  const label = (s: string) => (ts.has(s as never) ? ts(s as never) : s);
  const extra = f.specialties.filter((s) => !SPECIALTIES.includes(s));
  const video = f.introVideoUrl.trim();
  const embed = video ? videoEmbedUrl(video) : null;
  // Same rule as the API: only links that can be embedded on the public profile (YouTube, Vimeo, Loom, Google Drive).
  const videoInvalid = !!video && !embed;
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const approved = profile.status === "approved";

  async function save(e: FormEvent) {
    e.preventDefault();
    if (videoInvalid) return setError(t("videoInvalid"));
    setState("saving");
    setError("");
    try {
      await onSave(f);
      setState("saved");
    } catch (err) {
      setError(err instanceof ApiError && err.status ? err.message : t("saveError"));
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("title")}</h1>
          <p className="mt-1 text-[15px] text-muted">{t("subtitle")}</p>
        </div>
        {approved ? (
          <Link href={`/teachers/${profile.slug}`} className="inline-flex items-center gap-2 self-start text-sm font-semibold text-teal-dark hover:text-navy sm:self-auto">
            {t("viewPublic")}
            <Icon name="arrowRight" size={16} />
          </Link>
        ) : (
          <Badge tone="warning" className="self-start">
            {t("notPublic")}
          </Badge>
        )}
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={save} className="flex flex-col gap-5">
          <section aria-labelledby="photo-title" className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:p-[26px]">
            <h2 id="photo-title" className="text-[17px] font-bold">
              {t("photoTitle")}
            </h2>
            {API_URL ? (
              avatarKnown ? (
                <AvatarUpload initialUrl={photo} initials={initialsOf(profile.firstName, profile.lastName)} onUploaded={setPhoto} />
              ) : (
                <p role="status" className="text-sm text-muted">
                  {t("loadingPhoto")}
                </p>
              )
            ) : (
              <div className="flex items-center gap-4">
                <Avatar initials={currentTeacher.initials} tone={currentTeacher.tone} size={96} />
                <p className="text-[13px] text-muted">{t("demoPhoto")}</p>
              </div>
            )}
          </section>

          <section aria-labelledby="about-title" className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:p-[26px]">
            <h2 id="about-title" className="text-[17px] font-bold">
              {t("aboutTitle")}
            </h2>
            <Field label={t("headline")} hint={t("headlineHint")}>
              <Input required maxLength={120} value={f.headline} onChange={(e) => set("headline", e.target.value)} />
            </Field>
            <Field
              label={t("bio")}
              hint={
                <span className="flex flex-wrap justify-between gap-2">
                  <span>{t("bioHint")}</span>
                  <span className="tabular-nums">{t("bioCount", { count: f.bio.length.toLocaleString(intlTags[locale]), max: (3000).toLocaleString(intlTags[locale]) })}</span>
                </span>
              }
            >
              <Textarea required maxLength={3000} rows={8} value={f.bio} onChange={(e) => set("bio", e.target.value)} className="resize-y text-[15px]" />
            </Field>
          </section>

          <section aria-labelledby="teach-title" className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:p-[26px]">
            <h2 id="teach-title" className="text-[17px] font-bold">
              {t("teachTitle")}
            </h2>
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">{t("specialties")}</legend>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {[...SPECIALTIES, ...extra].map((s) => (
                  <ChoiceTile key={s} checked={f.specialties.includes(s)} onChange={(on) => toggle("specialties", s, on)}>
                    {label(s)}
                  </ChoiceTile>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex flex-wrap gap-2.5">
              <legend className="mb-3 text-sm font-semibold">{t("groups")}</legend>
              {GROUPS.map((g) => (
                <ChoiceTile key={g} shape="pill" checked={f.teaches.includes(g)} onChange={(on) => toggle("teaches", g, on)}>
                  {t(`group.${g}`)}
                </ChoiceTile>
              ))}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <TagInput label={t("languages")} tone="orange" placeholder={t("languagesPlaceholder")} values={f.languages} onChange={(v) => set("languages", v)} />
              <div className="flex flex-col gap-2">
                <TagInput label={t("certifications")} placeholder={t("certificationsPlaceholder")} values={f.certifications} onChange={(v) => set("certifications", v)} />
                {API_URL && <CertificateFiles />}
              </div>
            </div>
          </section>

          <section aria-labelledby="video-title" className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:p-[26px]">
            <h2 id="video-title" className="text-[17px] font-bold">
              {t("videoTitle")}
            </h2>
            <Field label={t("videoUrl")} hint={videoInvalid ? undefined : t("videoHint")}>
              <Input type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" value={f.introVideoUrl} onChange={(e) => set("introVideoUrl", e.target.value)} aria-invalid={videoInvalid} />
            </Field>
            {videoInvalid && (
              <p role="alert" className="-mt-2 text-[13px] text-danger-text">
                {t("videoInvalid")}
              </p>
            )}
            {embed && (
              <div className="aspect-video w-full max-w-[560px] overflow-hidden rounded-2xl bg-navy">
                <iframe src={embed} title={t("videoPreview")} className="size-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span role="status" className="me-auto text-sm">
              {error ? (
                <span role="alert" className="text-danger-text">
                  {error}
                </span>
              ) : state === "saved" ? (
                <span className="flex items-center gap-1.5 text-teal-deep">
                  <Icon name="check" size={16} strokeWidth={2.4} />
                  {API_URL ? t("saved") : t("savedDemo")}
                </span>
              ) : null}
            </span>
            <Button type="submit" variant="teal" className="h-[52px] px-7 font-bold" disabled={state === "saving"}>
              {state === "saving" ? t("saving") : t("save")}
            </Button>
          </div>
        </form>

        {/* How students see the teacher card */}
        <aside aria-labelledby="preview-title" className="flex flex-col gap-3 xl:sticky xl:top-8">
          <h2 id="preview-title" className="text-sm text-muted">
            {t("previewTitle")}
          </h2>
          <div className="flex flex-col gap-3 rounded-3xl bg-white p-6">
            <div className="flex items-center gap-3.5">
              <Avatar initials={initialsOf(profile.firstName, profile.lastName)} size={64} src={fileSrc(photo)} />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold">{name}</p>
                <p className="text-sm text-navy-soft">{f.headline || t("noHeadline")}</p>
              </div>
            </div>
            {f.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {f.specialties.map((s) => (
                  <Tag key={s}>{label(s)}</Tag>
                ))}
              </div>
            )}
            <p className="line-clamp-4 text-sm leading-normal text-navy-soft">{f.bio || t("noBio")}</p>
            {approved && (
              <Link href={`/teachers/${profile.slug}`} className="text-sm font-semibold text-teal-dark hover:text-navy">
                {t("viewPublic")}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
