import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { cn } from "@/lib/cn";

const studentSteps = ["account", "verifyEmail", "goals", "levelTest"] as const;
const teacherSteps = ["account", "verifyEmail", "application"] as const;

/** Sign-up progress: students 1 · Account → 4 · Level test; teachers 1 · Account → 3 · Application. */
export function SignupSteps({ current, teacher = false }: { current: 1 | 2 | 3 | 4; teacher?: boolean }) {
  const t = useTranslations("auth.steps");
  const steps = teacher ? teacherSteps : studentSteps;
  return (
    <ol aria-label={t("label")} className="flex gap-2 text-[13px] font-semibold">
      {steps.map((id, i) => {
        const n = i + 1;
        const done = n <= current;
        const label = t(id);
        return (
          <li key={id} aria-current={n === current ? "step" : undefined} className={cn("flex flex-1 flex-col gap-2", !done && "text-muted")}>
            <span aria-hidden="true" className={cn("h-[5px] rounded", done ? "bg-teal-dark" : "bg-sand")} />
            <span>
              {n}
              <span className="hidden sm:inline"> · {label}</span>
              <span className="sr-only sm:hidden"> {label}</span>
              {n < current && <span className="sr-only"> {t("completed")}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Right-hand column of the split auth layout. */
export function AuthMain({ topRight, children }: { topRight?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col gap-[26px] px-6 py-8 sm:px-12 lg:px-[120px] lg:py-14">
      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
        {topRight && <div className="flex flex-wrap justify-end gap-1.5 text-[15px] text-muted">{topRight}</div>}
        <LanguageSwitcher />
      </div>
      {children}
    </main>
  );
}

export function OrDivider({ children }: { children?: ReactNode }) {
  const t = useTranslations("auth");
  return (
    <div className="flex items-center gap-4 text-[13px] text-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
      {children ?? t("orWithEmail")}
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
    </div>
  );
}
