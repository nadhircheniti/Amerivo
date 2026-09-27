import Link from "next/link";

const columns = [
  {
    title: "Learn",
    links: [
      { href: "/teachers", label: "Find a teacher" },
      { href: "/onboarding/goals", label: "Placement test" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Teach",
    links: [
      { href: "/teach/apply", label: "Become a teacher" },
      { href: "/teach/apply#faq", label: "Teacher FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "mailto:support@amerivo.example", label: "Support" },
      { href: "/privacy", label: "Privacy & GDPR" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-sand bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 pt-14 pb-9 lg:px-20">
        <div className="flex flex-col gap-10 md:flex-row md:gap-20">
          <div className="flex w-full max-w-[360px] flex-col gap-3.5">
            <span className="font-display text-[26px] font-bold">
              Amerivo <span className="text-xs font-medium tracking-[5px]">ENGLISH</span>
            </span>
            <p className="text-[15px] leading-relaxed text-muted">Real People. Real Conversations. A Brighter You.</p>
          </div>
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-2.5 text-[15px]">
              <strong className="mb-1 font-display">{col.title}</strong>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href} className="text-teal-dark hover:text-navy">
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-line-soft pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Amerivo English LLC. All rights reserved.</span>
          <span className="font-display font-semibold tracking-[6px] text-navy">LEARN · CONNECT · GROW</span>
        </div>
      </div>
    </footer>
  );
}
