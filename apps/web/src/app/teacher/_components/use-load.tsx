"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/cn";

/** GET `path` once the session is ready (live mode only). `reload()` fetches again (e.g. after an action). */
export function useLoad<T>(path: string | null): {
  data: T | null;
  failed: boolean;
  retry: () => void;
  reload: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | null>>;
} {
  const { call, isLoaded, isSignedIn } = useApi();
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!API_URL || !path || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<T>(path)
      .then((d) => !cancelled && (setData(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [call, path, isLoaded, isSignedIn, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);
  const reload = useCallback(async () => {
    if (!path) return;
    setData(await call<T>(path));
  }, [call, path]);
  return { data, failed, retry, reload, setData };
}

/** Loading / "Try again" block shown while a live page waits for the API (it may be waking up). */
export function LoadState({ failed, onRetry, title, className }: { failed: boolean; onRetry: () => void; title?: string; className?: string }) {
  const t = useTranslations("teacher.common");
  return (
    <section className={cn("flex flex-col items-start gap-3 rounded-3xl bg-white p-5 sm:p-[26px]", className)} aria-busy={!failed}>
      {title && <h1 className="text-2xl font-extrabold sm:text-[26px]">{title}</h1>}
      {failed ? (
        <>
          <p role="alert" className="text-sm text-orange-text">
            {t("loadError")}
          </p>
          <Button variant="teal" size="sm" onClick={onRetry}>
            {t("retry")}
          </Button>
        </>
      ) : (
        <p role="status" className="text-sm text-muted">
          {t("loading")}
        </p>
      )}
    </section>
  );
}

/** "AB" from first and last name. */
export const initialsOf = (first?: string | null, last?: string | null) => `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "?";

/** Stable avatar colour per person. */
const tones = ["yellow", "sky", "lilac", "orange", "teal", "sand"] as const;
export const toneOf = (id: string) => tones[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length];

/** "Maria S." */
export const shortName = (first?: string | null, last?: string | null) => [first, last ? `${last.charAt(0)}.` : ""].filter(Boolean).join(" ");
