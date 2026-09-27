"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { API_URL, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ModeToggle } from "./mode-toggle";

/**
 * Vacation mode switch. Demo mode: local checkbox only.
 * Live mode: reads `vacationMode` (from `initial`, or GET /teacher/profile) and saves with POST /teacher/vacation.
 */
export function VacationToggle({
  initial,
  variant = "pill",
  withNote = true,
  className,
}: {
  /** Known value (e.g. the schedule page already loaded the profile); otherwise it is fetched. */
  initial?: boolean;
  variant?: "pill" | "row";
  withNote?: boolean;
  className?: string;
}) {
  const t = useTranslations("teacher.modes");
  const { call, isLoaded, isSignedIn } = useApi();
  const [on, setOn] = useState<boolean | null>(initial ?? null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const needsLoad = !!API_URL && initial === undefined;
  useEffect(() => {
    if (!needsLoad || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<{ vacationMode: boolean }>("/teacher/profile")
      .then((p) => !cancelled && (setOn(p.vacationMode), setLoadFailed(false)))
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, [needsLoad, call, isLoaded, isSignedIn, attempt]);

  const change = useCallback(
    async (next: boolean) => {
      setOn(next);
      setBusy(true);
      setError("");
      try {
        await call("/teacher/vacation", { method: "POST", body: JSON.stringify({ on: next }) });
      } catch (e) {
        setOn(!next);
        setError(e instanceof ApiError && e.status ? e.message : t("saveError"));
      } finally {
        setBusy(false);
      }
    },
    [call, t],
  );

  const note = withNote ? t("hiddenNote") : undefined;
  if (!API_URL) return <ModeToggle label={t("vacation")} variant={variant} onNote={note} className={className} />;

  return (
    <ModeToggle label={t("vacation")} variant={variant} onNote={note} className={className} checked={on ?? false} disabled={on === null || busy} onCheckedChange={change}>
      {loadFailed && on === null && (
        <span className="flex items-center gap-2 text-xs text-orange-text">
          {t("loadError")}
          <button type="button" onClick={() => (setLoadFailed(false), setAttempt((n) => n + 1))} className="font-semibold text-teal-dark underline hover:text-navy">
            {t("retry")}
          </button>
        </span>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger-text">
          {error}
        </span>
      )}
    </ModeToggle>
  );
}
