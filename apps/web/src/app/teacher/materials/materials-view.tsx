"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFiles } from "@/components/ui/file-upload";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/primitives";
import { MATERIAL_RULES, STATUS_TONE, fileSize, type Material } from "@/components/materials/types";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { LoadState, useLoad } from "../_components/use-load";

const errorText = (e: unknown, fallback: string) => (e instanceof ApiError && e.status ? e.message : fallback);

export function TeacherMaterials() {
  const t = useTranslations("teacher.materials");
  const { data, failed, retry, setData } = useLoad<Material[]>(API_URL ? "/teacher/materials" : null);

  if (!API_URL) {
    return (
      <Shell>
        <p className="rounded-3xl bg-white p-6 text-sm text-muted">{t("demo")}</p>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <LoadState failed={failed} onRetry={retry} />
      </Shell>
    );
  }
  return (
    <Shell>
      <UploadForm onUploaded={(m) => setData((list) => [m, ...(list ?? [])])} />
      <MaterialList items={data} onRemoved={(id) => setData((list) => (list ?? []).filter((m) => m.id !== id))} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("teacher.materials");
  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("title")}</h1>
        <p className="max-w-[720px] text-[15px] text-muted">{t("subtitle")}</p>
      </header>
      {children}
    </div>
  );
}

function UploadForm({ onUploaded }: { onUploaded: (m: Material) => void }) {
  const t = useTranslations("teacher.materials");
  const { postForm } = useFiles();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function pick(f: File | null) {
    setDone(false);
    setError(null);
    if (f && !MATERIAL_RULES.types.includes(f.type)) return setError(t("wrongType")), setFile(null);
    if (f && f.size > MATERIAL_RULES.maxMb * 1024 * 1024) return setError(t("tooLarge", { max: MATERIAL_RULES.maxMb })), setFile(null);
    setFile(f);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      if (description.trim()) form.append("description", description.trim());
      form.append("file", file, file.name);
      onUploaded(await postForm<Material>("/teacher/materials", form));
      setTitle("");
      setDescription("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setDone(true);
    } catch (err) {
      setError(errorText(err, t("uploadError")));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="upload-title" className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:p-[26px]">
      <h2 id="upload-title" className="text-[17px] font-bold">
        {t("uploadTitle")}
      </h2>
      <p className="flex items-start gap-2.5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-navy">
        <Icon name="shieldCheck" size={18} className="mt-0.5 shrink-0 text-teal-dark" />
        {t("reviewNotice")}
      </p>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fieldTitle")}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MATERIAL_RULES.titleMax} required placeholder={t("titlePlaceholder")} />
        </Field>
        <Field label={t("fieldFile")} hint={t("fileHint", { max: MATERIAL_RULES.maxMb })}>
          <input
            ref={fileRef}
            type="file"
            accept={MATERIAL_RULES.accept}
            required
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="text-sm file:me-3 file:rounded-full file:border-0 file:bg-teal-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-deep"
          />
        </Field>
        <Field label={t("fieldDescription")} className="sm:col-span-2">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={MATERIAL_RULES.descriptionMax} rows={3} placeholder={t("descriptionPlaceholder")} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="teal" disabled={pending || !file || !title.trim()}>
            {pending ? t("uploading") : t("submit")}
          </Button>
          <span role="status" className="text-sm">
            {error ? (
              <span role="alert" className="text-danger-text">
                {error}
              </span>
            ) : done ? (
              <span className="text-teal-deep">{t("uploaded")}</span>
            ) : null}
          </span>
        </div>
      </form>
    </section>
  );
}

function MaterialList({ items, onRemoved }: { items: Material[]; onRemoved: (id: string) => void }) {
  const t = useTranslations("teacher.materials");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const { open } = useFiles();
  const { call } = useApi();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const date = (iso: string) => new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(new Date(iso));

  async function remove(m: Material) {
    if (!window.confirm(t("deleteConfirm", { title: m.title }))) return;
    setBusy(m.id);
    setError(null);
    try {
      await call(`/teacher/materials/${encodeURIComponent(m.id)}`, { method: "DELETE" });
      onRemoved(m.id);
    } catch (e) {
      setError(errorText(e, t("deleteError")));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="list-title" className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:p-[26px]">
      <h2 id="list-title" className="text-[17px] font-bold">
        {t("listTitle", { count: items.length })}
      </h2>
      {error && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded-2xl bg-beige px-6 py-8 text-center text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-beige-2">
          {items.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex min-w-0 grow flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="break-words">{m.title}</strong>
                  <Badge tone={STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge>
                </div>
                {m.description && <p className="text-sm break-words whitespace-pre-line text-navy-soft">{m.description}</p>}
                <p className="text-xs text-muted">
                  {m.fileName} · {fileSize(m.sizeBytes, tag)} · {t("addedOn", { date: date(m.createdAt) })}
                </p>
                {m.status === "rejected" && m.reviewNote && (
                  <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm text-danger-text">{t("rejectedBecause", { reason: m.reviewNote })}</p>
                )}
                {m.status === "pending" && <p className="text-xs text-orange-text">{t("pendingHint")}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => void open(m.fileUrl).catch((e) => setError(errorText(e, t("openError"))))}>
                  {t("open")}
                </Button>
                <Button variant="outline" size="sm" disabled={busy === m.id} onClick={() => void remove(m)}>
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
