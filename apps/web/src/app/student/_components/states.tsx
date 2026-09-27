"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import type { DataState } from "../_lib/use-student-data";

/** Loading → error ("Try again") → content, for one student-space endpoint. */
export function Loadable<T>({ state, children, skeleton }: { state: DataState<T>; children: (data: T) => ReactNode; skeleton?: ReactNode }) {
  if (state.data) return <>{children(state.data)}</>;
  if (state.error) return <ErrorState status={state.error.status} message={state.error.message} onRetry={state.reload} />;
  return <>{skeleton ?? <LoadingState />}</>;
}

export function LoadingState({ className }: { className?: string }) {
  const t = useTranslations("student.states");
  return (
    <div className={className ?? "flex flex-col gap-4"} role="status" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>
      <div className="h-28 animate-pulse rounded-3xl bg-white/70" aria-hidden="true" />
      <div className="h-48 animate-pulse rounded-3xl bg-white/70" aria-hidden="true" />
    </div>
  );
}

export function ErrorState({ status, message, onRetry }: { status: number; message: string; onRetry: () => void }) {
  const t = useTranslations("student.states");
  const forbidden = status === 403;
  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl bg-white p-6 sm:p-[26px]" role="alert">
      <p className="font-display text-lg font-bold">{forbidden ? t("studentsOnlyTitle") : t("errorTitle")}</p>
      <p className="text-sm text-navy-soft">{forbidden ? t("studentsOnly") : t("errorText")}</p>
      {!forbidden && message && <p className="text-xs text-muted">{message}</p>}
      {!forbidden && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <Icon name="repeat" size={16} />
          {t("tryAgain")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "calendar", title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-dark">
        <Icon name={icon} size={26} />
      </span>
      <p className="font-display text-lg font-bold">{title}</p>
      {text && <p className="max-w-md text-sm text-navy-soft">{text}</p>}
      {action}
    </div>
  );
}

/** Page title block used by the student sub-pages. */
export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-[26px] font-extrabold sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
