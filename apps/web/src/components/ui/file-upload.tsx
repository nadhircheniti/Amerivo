"use client";

/**
 * File uploads to the Amerivo API (POST /api/files, multipart "file" + "purpose").
 *
 * Stored files are addressed by a path relative to the API origin: `/api/files/<id>` (that is what
 * the API saves in users.avatarUrl). The browser loads them from the API origin, which is
 * NEXT_PUBLIC_API_URL without its trailing "/api": use `fileSrc(url)` to build the full address.
 * Profile photos are public (plain <img>); certificates are private, so they are fetched with the
 * session token and opened as a local blob (`useFiles().open`).
 */
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Avatar, type AvatarTone } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL, ApiError, DEV_USER } from "@/lib/api";
import { clerkEnabled } from "@/lib/auth-config";
import { cn } from "@/lib/cn";

// Re-exported for existing imports; the helpers live in lib/files.ts so server components can use them.
export { API_ORIGIN, fileSrc } from "@/lib/files";
import { fileSrc } from "@/lib/files";

export type FilePurpose = "avatar" | "certificate";
export type StoredFile = { id: string; url: string; fileName: string; contentType: string; sizeBytes: number; purpose?: string; createdAt?: string };

/** Same limits as the API (checked here first to avoid a useless upload). */
export const UPLOAD_RULES: Record<FilePurpose, { types: string[]; accept: string; maxMb: number }> = {
  avatar: { types: ["image/jpeg", "image/png", "image/webp"], accept: "image/jpeg,image/png,image/webp", maxMb: 2 },
  certificate: { types: ["application/pdf", "image/jpeg", "image/png"], accept: "application/pdf,image/jpeg,image/png", maxMb: 5 },
};

function useClerkToken() {
  const { getToken } = useAuth();
  return getToken;
}
const noToken = async () => null;
const useNoToken = () => noToken;
/** Build-time constant, like useApi: the same hook is always called for a given build. */
const useToken = clerkEnabled ? useClerkToken : useNoToken;

async function errorOf(res: Response) {
  try {
    const body = await res.json();
    return new ApiError(res.status, Array.isArray(body.message) ? body.message.join(", ") : body.message || `Request failed (${res.status})`);
  } catch {
    return new ApiError(res.status, `Request failed (${res.status})`);
  }
}

/** Upload, list, open and delete the signed-in user's files. */
export function useFiles() {
  const getToken = useToken();
  const request = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!API_URL) throw new ApiError(0, "The service is not connected yet (demo mode).");
      const token = await getToken();
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : DEV_USER ? { "x-dev-user": DEV_USER } : {}), ...init.headers },
      });
      if (!res.ok) throw await errorOf(res);
      return res;
    },
    [getToken],
  );

  const upload = useCallback(
    async (file: File, purpose: FilePurpose) => {
      const form = new FormData();
      form.append("purpose", purpose);
      form.append("file", file, file.name);
      return (await (await request("/files", { method: "POST", body: form })).json()) as StoredFile;
    },
    [request],
  );
  const list = useCallback(async (purpose: FilePurpose) => (await (await request(`/files?purpose=${purpose}`)).json()) as StoredFile[], [request]);
  const remove = useCallback(async (id: string) => void (await request(`/files/${encodeURIComponent(id)}`, { method: "DELETE" })), [request]);
  /** Private files need the session token: fetch them, then open the local copy in a new tab. */
  const open = useCallback(
    async (url: string) => {
      const tab = window.open("", "_blank");
      try {
        const blob = await (await request(url.replace(/^\/api/, ""))).blob();
        const local = URL.createObjectURL(blob);
        if (tab) tab.location.href = local;
        else window.location.href = local;
        setTimeout(() => URL.revokeObjectURL(local), 60_000);
      } catch (e) {
        tab?.close();
        throw e;
      }
    },
    [request],
  );
  /** Multipart POST to any API path (e.g. teaching documents: file + title + description). */
  const postForm = useCallback(async <T,>(path: string, form: FormData) => (await (await request(path, { method: "POST", body: form })).json()) as T, [request]);
  return { upload, list, remove, open, postForm };
}

/** Client-side check with the same rules as the API; returns an error message or null. */
function useCheck() {
  const t = useTranslations("teacher.upload");
  return (file: File, purpose: FilePurpose) => {
    const rule = UPLOAD_RULES[purpose];
    if (!rule.types.includes(file.type)) return purpose === "avatar" ? t("wrongTypePhoto") : t("wrongTypeCertificate");
    if (file.size > rule.maxMb * 1024 * 1024) return t("tooLarge", { max: rule.maxMb });
    return null;
  };
}

const message = (e: unknown, fallback: string) => (e instanceof ApiError && e.status ? e.message : fallback);

/* ------------------------------------------------------------------ profile photo */
/**
 * Profile photo with preview and "Upload / Replace photo". The API stores it and sets the account's
 * avatarUrl; `onUploaded` receives the new "/api/files/<id>" path.
 */
export function AvatarUpload({
  initialUrl,
  initials,
  tone = "teal",
  size = 96,
  onUploaded,
  className,
}: {
  /** Current photo ("/api/files/<id>" or absolute). */
  initialUrl?: string | null;
  initials: string;
  tone?: AvatarTone;
  size?: number;
  onUploaded?: (url: string) => void;
  className?: string;
}) {
  const t = useTranslations("teacher.upload");
  const { upload } = useFiles();
  const check = useCheck();
  const [uploaded, setUrl] = useState<string | null>(null);
  const url = uploaded ?? initialUrl ?? null;
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setDone(false);
    const problem = check(file, "avatar");
    if (problem) return setError(problem);
    setError("");
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const f = await upload(file, "avatar");
      setUrl(f.url);
      setDone(true);
      onUploaded?.(f.url);
    } catch (e) {
      setPreview(null);
      setError(message(e, t("uploadError")));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const src = preview ?? fileSrc(url);
  return (
    <div className={cn("flex flex-col items-start gap-5 sm:flex-row sm:items-center", className)}>
      <span className="relative">
        {src ? (
          <Avatar initials={initials} tone={tone} size={size} src={src} alt={t("photoAlt")} />
        ) : (
          <span className="flex shrink-0 items-center justify-center rounded-full bg-beige text-muted" style={{ width: size, height: size }} aria-hidden="true">
            <Icon name="user" size={Math.round(size * 0.42)} />
          </span>
        )}
        {busy && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-navy/40 text-xs font-semibold text-white">{t("uploading")}</span>}
      </span>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-semibold">{t("photo")}</p>
        <p id={hintId} className="text-[13px] text-muted">
          {t("photoHint", { max: UPLOAD_RULES.avatar.maxMb })}
        </p>
        <label
          className={cn(
            "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-navy bg-white px-4 text-sm font-semibold text-navy hover:bg-beige has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal",
            busy && "cursor-wait opacity-60",
          )}
        >
          <Icon name="paperclip" size={16} />
          {url ? t("replacePhoto") : t("uploadPhoto")}
          <input
            ref={input}
            type="file"
            accept={UPLOAD_RULES.avatar.accept}
            className="sr-only"
            disabled={busy}
            aria-describedby={hintId}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        <span aria-live="polite" className="text-[13px]">
          {error ? (
            <span role="alert" className="text-danger-text">
              {error}
            </span>
          ) : done ? (
            <span className="flex items-center gap-1.5 text-teal-deep">
              <Icon name="check" size={14} strokeWidth={2.4} />
              {t("photoSaved")}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ certificates */
/** The teacher's certificate files: list, upload (several at once), open (private) and remove. */
export function CertificateFiles({ className }: { className?: string }) {
  const t = useTranslations("teacher.upload");
  const locale = useLocale() as Locale;
  const { upload, list, remove, open } = useFiles();
  const check = useCheck();
  const [items, setItems] = useState<StoredFile[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();

  useEffect(() => {
    if (!API_URL) return;
    let cancelled = false;
    list("certificate")
      .then((rows) => !cancelled && (setItems(rows), setLoadFailed(false)))
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, [list, attempt]);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    const added: StoredFile[] = [];
    try {
      for (const file of Array.from(files)) {
        const problem = check(file, "certificate");
        if (problem) {
          setError(`${file.name}: ${problem}`);
          continue;
        }
        try {
          added.push(await upload(file, "certificate"));
        } catch (e) {
          setError(`${file.name}: ${message(e, t("uploadError"))}`);
        }
      }
    } finally {
      setItems((cur) => [...added.reverse(), ...(cur ?? [])]);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function drop(f: StoredFile) {
    setError("");
    try {
      await remove(f.id);
      setItems((cur) => (cur ?? []).filter((x) => x.id !== f.id));
    } catch (e) {
      setError(message(e, t("removeError")));
    }
  }

  async function view(f: StoredFile) {
    setError("");
    try {
      await open(f.url);
    } catch (e) {
      setError(message(e, t("openError")));
    }
  }

  const size = (n: number) =>
    n >= 1024 * 1024 ? t("sizeMb", { size: (n / 1024 / 1024).toLocaleString(intlTags[locale], { maximumFractionDigits: 1 }) }) : t("sizeKb", { size: Math.max(1, Math.round(n / 1024)).toLocaleString(intlTags[locale]) });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {loadFailed && (
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-orange-text">
          {t("loadError")}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-teal-dark underline hover:text-navy">
            {t("retry")}
          </button>
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label={t("certificatesList")}>
          {items.map((f) => (
            <li key={f.id} className="flex items-center gap-2.5 rounded-xl bg-beige px-3 py-2 text-[13px]">
              <Icon name="file" size={16} className="shrink-0 text-teal-dark" />
              <button type="button" onClick={() => view(f)} className="min-w-0 grow truncate text-start font-semibold text-navy underline-offset-2 hover:underline">
                {f.fileName}
                <span className="sr-only"> {t("opensNewTab")}</span>
              </button>
              <span className="shrink-0 text-muted">{size(f.sizeBytes)}</span>
              <button type="button" onClick={() => drop(f)} aria-label={t("remove", { name: f.fileName })} className="shrink-0 rounded p-1 text-muted hover:bg-white hover:text-navy">
                <Icon name="x" size={14} strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label
        className={cn(
          "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-teal-dark bg-teal-50 px-4 text-sm font-semibold text-navy hover:bg-teal-100 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal",
          busy && "cursor-wait opacity-60",
        )}
      >
        <Icon name="paperclip" size={16} />
        {busy ? t("uploading") : t("uploadCertificates")}
        <input ref={input} type="file" multiple accept={UPLOAD_RULES.certificate.accept} className="sr-only" disabled={busy} aria-describedby={hintId} onChange={(e) => pick(e.target.files)} />
      </label>
      <p id={hintId} className="text-[13px] text-muted">
        {t("certificatesHint", { max: UPLOAD_RULES.certificate.maxMb })}
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
