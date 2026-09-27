"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Chip list with an inline "Add…" input (Enter or comma adds a chip). */
export function TagInput({
  label,
  values,
  onChange,
  tone = "teal",
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  tone?: "teal" | "orange";
  placeholder?: string;
}) {
  const t = useTranslations("apply.fields");
  const [draft, setDraft] = useState("");
  const id = useId();

  function commit() {
    const v = draft.trim().replace(/,$/, "");
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex min-h-[50px] flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white p-2 focus-within:border-teal-dark">
        {values.map((v) => (
          <span key={v} className={cn("flex items-center gap-1 rounded-lg py-1.5 ps-2.5 pe-1.5 text-[13px]", tone === "teal" ? "bg-teal-100" : "bg-orange-100")}>
            {v}
            <button type="button" aria-label={t("remove", { value: v })} onClick={() => onChange(values.filter((x) => x !== v))} className="rounded p-0.5 hover:bg-white/60">
              <Icon name="x" size={12} strokeWidth={2.4} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={placeholder ?? t("add")}
          className="min-w-[80px] flex-1 bg-transparent px-1 text-sm text-navy placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}

/** File picker styled as a dashed pill or tile. Shows the chosen file name(s). */
export function UploadButton({
  label,
  accept,
  multiple,
  files,
  onFiles,
  variant = "pill",
  icon = "paperclip",
  hint,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  files: string[];
  onFiles: (names: string[]) => void;
  variant?: "pill" | "tile";
  icon?: IconName;
  hint?: ReactNode;
}) {
  const t = useTranslations("apply.fields");
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", variant === "pill" && "items-start")}>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="peer sr-only"
        onChange={(e) => {
          // TODO(api): upload to storage; we only keep the file names for the UI milestone.
          const names = Array.from(e.target.files ?? []).map((f) => f.name);
          if (names.length) onFiles(multiple ? [...files, ...names] : names);
          e.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 border border-dashed border-teal-dark bg-teal-50 font-semibold text-navy hover:bg-teal-100 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal",
          variant === "pill" ? "h-11 rounded-full px-4 text-sm" : "min-h-[120px] flex-col rounded-2xl p-5 text-center text-[15px]",
        )}
      >
        <Icon name={icon} size={variant === "pill" ? 16 : 24} className="text-teal-dark" />
        {label}
        {hint && variant === "tile" && <span className="text-[13px] font-normal text-muted">{hint}</span>}
      </label>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1 text-[13px] text-navy-soft" aria-label={t("selectedFiles")}>
          {files.map((f) => (
            <li key={f} className="flex items-center gap-1.5">
              <Icon name="check" size={14} strokeWidth={2.4} className="text-teal-dark" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <legend className="mb-3 font-display text-[15px] font-bold">{children}</legend>;
}
