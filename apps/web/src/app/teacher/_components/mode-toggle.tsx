"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Labelled checkbox used for Vacation / Holiday mode.
 * - "pill": standalone white pill (dashboard header)
 * - "row": label on the left, checkbox on the right (settings cards)
 */
export function ModeToggle({
  label,
  defaultChecked = false,
  variant = "pill",
  onNote,
  className,
}: {
  label: string;
  defaultChecked?: boolean;
  variant?: "pill" | "row";
  /** Short status text announced when the mode is on. */
  onNote?: string;
  className?: string;
}) {
  const [on, setOn] = useState(defaultChecked);
  const noteId = useId();
  return (
    <div className={cn("flex flex-col gap-1", variant === "pill" && "items-start sm:items-end", className)}>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-2.5",
          variant === "pill"
            ? "rounded-full bg-white px-[18px] py-2.5 text-sm font-semibold"
            : "justify-between text-[15px]",
        )}
      >
        {variant === "pill" && (
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} aria-describedby={onNote ? noteId : undefined} className="size-[18px]" />
        )}
        {label}
        {variant === "row" && (
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} aria-describedby={onNote ? noteId : undefined} className="size-5" />
        )}
      </label>
      {onNote && (
        <span id={noteId} aria-live="polite" className={cn("text-xs font-semibold text-teal-dark", !on && "sr-only")}>
          {on ? onNote : ""}
        </span>
      )}
    </div>
  );
}
