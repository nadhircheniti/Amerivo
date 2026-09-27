import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "./language-switcher";

/** Slim header for focused flows (onboarding, checkout, teacher application). */
export function FocusHeader({
  center,
  right,
  progress,
  brandSuffix,
}: {
  center?: ReactNode;
  right?: { href: string; label: string } | ReactNode;
  /** 0–100; renders the thin progress bar under the header */
  progress?: number;
  brandSuffix?: string;
}) {
  const t = useTranslations("common");
  return (
    <>
      <header className="border-b border-sand bg-white">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-20">
          <span className="flex items-center gap-2">
            <Logo size="sm" subtitle={null} />
            {brandSuffix && <span className="font-display text-sm font-medium text-teal-dark">{brandSuffix}</span>}
          </span>
          {center && <span className="hidden text-[15px] text-muted sm:block">{center}</span>}
          {right && typeof right === "object" && "href" in (right as object) ? (
            <Link href={(right as { href: string }).href} className="text-[15px] font-semibold text-teal-dark hover:text-navy">
              {(right as { label: string }).label}
            </Link>
          ) : (
            ((right as ReactNode) ?? <LanguageSwitcher compact />)
          )}
        </div>
      </header>
      {progress !== undefined && (
        <div className="h-[5px] bg-sand" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t("progress")}>
          <div className="h-full bg-teal-dark" style={{ width: `${progress}%` }} />
        </div>
      )}
    </>
  );
}
