"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Labelled checkbox used for Vacation / Holiday mode.
 * - "pill": standalone white pill (dashboard header)
 * - "row": label on the left, checkbox on the right (settings cards)
 * Uncontrolled by default (`defaultChecked`); pass `checked` + `onCheckedChange` to control it.
 */
export function ModeToggle({
  label,
  defaultChecked = false,
  checked,
  onCheckedChange,
  disabled = false,
  variant = "pill",
  onNote,
  className,
  children,
}: {
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (on: boolean) => void;
  disabled?: boolean;
  variant?: "pill" | "row";
  /** Short status text announced when the mode is on. */
  onNote?: string;
  className?: string;
  /** Extra line under the toggle (e.g. an error). */
  children?: React.ReactNode;
}) {
  const [own, setOwn] = useState(defaultChecked);
  const on = checked ?? own;
  const change = (v: boolean) => {
    if (checked === undefined) setOwn(v);
    onCheckedChange?.(v);
  };
  const noteId = useId();
  const input = (size: string) => (
    <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => change(e.target.checked)} aria-describedby={onNote ? noteId : undefined} className={size} />
  );
  return (
    <div className={cn("flex flex-col gap-1", variant === "pill" && "items-start sm:items-end", className)}>
      <label
        className={cn(
          "flex items-center gap-2.5",
          disabled ? "cursor-wait opacity-70" : "cursor-pointer",
          variant === "pill" ? "rounded-full bg-white px-[18px] py-2.5 text-sm font-semibold" : "justify-between text-[15px]",
        )}
      >
        {variant === "pill" && input("size-[18px]")}
        {label}
        {variant === "row" && input("size-5")}
      </label>
      {onNote && (
        <span id={noteId} aria-live="polite" className={cn("text-xs font-semibold text-teal-dark", !on && "sr-only")}>
          {on ? onNote : ""}
        </span>
      )}
      {children}
    </div>
  );
}
