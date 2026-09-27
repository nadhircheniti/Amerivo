import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/* ---------- Card ---------- */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl bg-white", className)} {...props} />;
}

/* ---------- Eyebrow (small uppercase label) ---------- */
export function Eyebrow({ children, className, onDark = false }: { children: ReactNode; className?: string; onDark?: boolean }) {
  return <span className={cn("font-display text-[13px] font-semibold tracking-[4px] uppercase", onDark ? "text-yellow" : "text-teal-dark", className)}>{children}</span>;
}

/* ---------- Badge / status pill ---------- */
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "lilac" | "orange";
const badgeTones: Record<BadgeTone, string> = {
  success: "bg-teal-100 text-teal-deep",
  warning: "bg-orange-100 text-orange-text",
  danger: "bg-danger-100 text-danger-text",
  info: "bg-sky-100 text-[#154e66]",
  neutral: "bg-line-soft text-navy",
  lilac: "bg-lilac-100 text-lilac",
  orange: "bg-orange text-navy",
};
export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", badgeTones[tone], className)}>{children}</span>;
}

/* ---------- Tag (neutral chip, e.g. specialties) ---------- */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("rounded-full bg-beige px-2.5 py-1 text-xs text-navy", className)}>{children}</span>;
}

/* ---------- Avatar (photo when available, initials otherwise) ---------- */
export type AvatarTone = "teal" | "orange" | "sky" | "lilac" | "yellow" | "sand" | "navy";
const avatarTones: Record<AvatarTone, string> = {
  teal: "bg-teal-100 text-teal-dark",
  orange: "bg-orange-100 text-orange-dark",
  sky: "bg-sky-100 text-sky",
  lilac: "bg-lilac-100 text-lilac",
  yellow: "bg-yellow text-navy",
  sand: "bg-sand text-navy",
  navy: "bg-[#2e5872] text-white",
};
/**
 * `src`: absolute image URL (for API files, build it with `fileSrc()` from "@/components/ui/file-upload").
 * Decorative by default (the name is written next to it); pass `alt` when the photo carries meaning.
 */
export function Avatar({
  initials,
  tone = "teal",
  size = 48,
  className,
  online,
  square = false,
  src,
  alt,
}: {
  initials: string;
  tone?: AvatarTone;
  size?: number;
  className?: string;
  online?: boolean;
  square?: boolean;
  src?: string | null;
  alt?: string;
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center font-display font-bold", square ? "rounded-[20px]" : "rounded-full", avatarTones[tone], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
      aria-hidden={alt ? undefined : "true"}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos come from the API origin, sized by the parent
        <img src={src} alt={alt ?? ""} width={size} height={size} loading="lazy" className={cn("size-full object-cover", square ? "rounded-[20px]" : "rounded-full")} />
      ) : (
        initials
      )}
      {online && <span className="absolute end-0 bottom-0 size-3 rounded-full border-2 border-white bg-online" />}
    </span>
  );
}

/* ---------- Stars ---------- */
export function Rating({ value, className, size = 16 }: { value: number; className?: string; size?: number }) {
  const t = useTranslations("common.rating");
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold", className)}>
      <Icon name="star" size={size} className="text-orange" />
      {value > 0 ? value.toFixed(1) : t("new")}
      {value > 0 && <span className="sr-only"> {t("outOf5")}</span>}
    </span>
  );
}

export function StarRow({ count = 5, size = 16 }: { count?: number; size?: number }) {
  const t = useTranslations("common.rating");
  return (
    <span className="inline-flex gap-0.5" aria-label={t("stars", { count })}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" size={size} className={i < count ? "text-orange" : "text-line"} />
      ))}
    </span>
  );
}

/* ---------- Checklist item ---------- */
export function CheckItem({ children, className, iconClassName = "text-teal-dark" }: { children: ReactNode; className?: string; iconClassName?: string }) {
  return (
    <li className={cn("flex items-center gap-2", className)}>
      <Icon name="check" size={16} strokeWidth={2.4} className={iconClassName} />
      {children}
    </li>
  );
}

/* ---------- Stat tile ---------- */
export function StatTile({ label, value, hint, hintClassName }: { label: string; value: ReactNode; hint?: ReactNode; hintClassName?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] bg-white p-[22px]">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-display text-[30px] font-extrabold leading-tight">{value}</span>
      {hint && <span className={cn("text-[13px] text-muted", hintClassName)}>{hint}</span>}
    </div>
  );
}

/* ---------- Divider ---------- */
export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-line-soft", className)} />;
}

/* ---------- Photo placeholder (until real imagery is supplied) ---------- */
export function PhotoPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex items-end justify-center bg-sand", className)} role="img" aria-label={label}>
      <span className="mb-5 rounded-full bg-navy/55 px-3 py-1.5 text-xs tracking-wide text-white uppercase">{label}</span>
    </div>
  );
}
