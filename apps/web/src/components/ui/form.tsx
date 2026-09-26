import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "h-[50px] w-full rounded-xl border border-line bg-white px-3.5 text-[15px] font-normal text-navy placeholder:text-muted/80 focus:border-teal-dark focus:outline-none";

export function Field({ label, children, className, hint }: { label: ReactNode; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-semibold", className)}>
      {label}
      {children}
      {hint && <span className="text-[13px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "px-3", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("w-full resize-none rounded-xl border border-line bg-white px-3.5 py-3 text-sm font-normal text-navy focus:border-teal-dark focus:outline-none", className)} {...props} />;
}

/** Selectable option rendered as a bordered tile/pill (checkbox or radio inside). */
export function ChoiceTile({
  type = "checkbox",
  name,
  checked,
  defaultChecked,
  onChange,
  children,
  shape = "tile",
  className,
}: {
  type?: "checkbox" | "radio";
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  children: ReactNode;
  shape?: "tile" | "pill";
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 border border-line text-sm has-[:checked]:border-2 has-[:checked]:border-teal-dark has-[:checked]:bg-teal-50 has-[:checked]:font-semibold",
        shape === "tile" ? "rounded-xl p-3.5" : "rounded-full px-[18px] py-3",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="size-[18px]"
      />
      {children}
    </label>
  );
}

/** Segmented control / toggle pill group. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-[14px] bg-beige p-[5px]", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-11 flex-1 rounded-[10px] px-4 text-[15px] text-navy",
            value === o.value ? "bg-white font-semibold shadow-[0_2px_8px_rgb(15_59_91/0.1)]" : "bg-transparent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
