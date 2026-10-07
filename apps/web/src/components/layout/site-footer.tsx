import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

const columns = [
  {
    title: "learn",
    links: [
      { href: "/teachers", key: "findTeacher" },
      { href: "/onboarding/goals", key: "placementTest" },
      { href: "/#pricing", key: "pricing" },
    ],
  },
  {
    title: "teach",
    links: [
      { href: "/teach/apply", key: "becomeTeacher" },
      { href: "/faq#teachers", key: "teacherFaq" },
    ],
  },
  {
    title: "company",
    links: [
      { href: "/about", key: "about" },
      { href: "/faq", key: "faq" },
      { href: "/contact", key: "contact" },
      { href: "/privacy", key: "privacy" },
      { href: "/terms", key: "terms" },
    ],
  },
] as const;

export function SiteFooter() {
  const t = useTranslations("common.footer");
  return (
    <footer className="border-t border-sand bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 pt-14 pb-9 lg:px-20">
        <div className="flex flex-col gap-10 md:flex-row md:gap-20">
          <div className="flex w-full max-w-[360px] flex-col gap-3.5">
            <span className="font-display text-[26px] font-bold">
              Amerivo <span className="text-xs font-medium tracking-[5px]">ENGLISH</span>
            </span>
            <p className="text-[15px] leading-relaxed text-muted">{t("tagline")}</p>
            <LanguageSwitcher className="self-start" />
          </div>
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-2.5 text-[15px]">
              <strong className="mb-1 font-display">{t(col.title)}</strong>
              {col.links.map((l) => (
                <Link key={l.key} href={l.href} className="text-teal-dark hover:text-navy">
                  {t(l.key)}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-line-soft pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <span>{t("rights", { year: new Date().getFullYear() })}</span>
          <span className="font-display font-semibold tracking-[6px] text-navy">{t("motto")}</span>
        </div>
      </div>
    </footer>
  );
}
