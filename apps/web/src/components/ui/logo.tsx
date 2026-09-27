import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/** Placeholder redraw of the client's leaf mark — replace with final vector files when delivered. */
export function LogoMark({ size = 40, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="23" cy="8" r="6" fill={onDark ? "#FFFFFF" : "#0F3B5B"} />
      <path d="M3 18c9 0 17 7 19 25C11 41 3 31 3 18z" fill="#2FB7A8" />
      <path d="M13 23c6 3 9 10 8 19-6-4-10-10-8-19z" fill={onDark ? "#7FD3E0" : "#1D6F8C"} />
      <path d="M45 15c-11 0-19 9-21 27 12-2 21-12 21-27z" fill="#FFB366" />
      <path d="M37 26c-6 2-10 8-11 16 7-2 11-8 11-16z" fill="#FFD98E" />
    </svg>
  );
}

export function Logo({
  size = "md",
  onDark = false,
  subtitle = "ENGLISH",
  subtitleClassName,
  href = "/",
  className,
}: {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  subtitle?: string | null;
  subtitleClassName?: string;
  href?: string | null;
  className?: string;
}) {
  const t = useTranslations("common.nav");
  const s = { sm: { mark: 34, word: "text-[20px]", sub: "text-[9px] tracking-[4px]" }, md: { mark: 40, word: "text-2xl", sub: "text-[10px] tracking-[5px]" }, lg: { mark: 48, word: "text-[28px]", sub: "text-[11px] tracking-[6px]" } }[size];
  const content = (
    <>
      <LogoMark size={s.mark} onDark={onDark} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display font-bold tracking-tight", s.word, onDark ? "text-white" : "text-navy")}>Amerivo</span>
        {subtitle && (
          <span className={cn("mt-1 font-display font-medium", s.sub, onDark ? "text-white" : "text-navy", subtitleClassName)}>
            {subtitle}
          </span>
        )}
      </span>
    </>
  );
  if (!href) return <span className={cn("flex items-center gap-2.5", className)}>{content}</span>;
  return (
    <Link href={href} aria-label={t("homeLink")} className={cn("flex items-center gap-2.5", className)}>
      {content}
    </Link>
  );
}
