import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const steps = ["Account", "Verify email", "Your goals", "Level test"];

/** 4-step sign-up progress (1 · Account → 4 · Level test). */
export function SignupSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol aria-label="Sign-up progress" className="flex gap-2 text-[13px] font-semibold">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n <= current;
        return (
          <li key={label} aria-current={n === current ? "step" : undefined} className={cn("flex flex-1 flex-col gap-2", !done && "text-muted")}>
            <span aria-hidden="true" className={cn("h-[5px] rounded", done ? "bg-teal-dark" : "bg-sand")} />
            <span>
              {n}
              <span className="hidden sm:inline"> · {label}</span>
              <span className="sr-only sm:hidden"> {label}</span>
              {n < current && <span className="sr-only"> (completed)</span>}
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
      {topRight && <div className="flex flex-wrap justify-end gap-1.5 text-[15px] text-muted">{topRight}</div>}
      {children}
    </main>
  );
}

export function OrDivider({ children = "or with email" }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 text-[13px] text-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-sand" />
    </div>
  );
}
