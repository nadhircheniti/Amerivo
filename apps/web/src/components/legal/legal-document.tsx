/**
 * Shared layout and text blocks of the legal pages (Terms of Service, Privacy Policy).
 * The legal text is in English (the governing language); the page chrome is translated.
 */
import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; body: ReactNode };

export const P = ({ children }: { children: ReactNode }) => <p>{children}</p>;
export const L = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc space-y-1.5 ps-6">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);
export const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-navy">{children}</strong>;
export const Caps = ({ children }: { children: ReactNode }) => <p className="font-semibold tracking-[0.01em] text-navy uppercase">{children}</p>;
export const H3 = ({ children }: { children: ReactNode }) => <h3 className="mt-1 font-semibold text-navy">{children}</h3>;

export function LegalDocument({
  title,
  meta,
  contentsLabel,
  notices,
  sections,
}: {
  title: string;
  /** "Amerivo English LLC · Effective date: …" (English, like the text). */
  meta: string;
  contentsLabel: string;
  /** Translated notes above the text (English version prevails, key points…). */
  notices?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-12 lg:flex-row lg:items-start lg:px-20 lg:py-16">
      <nav aria-label={contentsLabel} className="rounded-3xl bg-white p-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[300px] lg:shrink-0 lg:overflow-y-auto">
        <h2 className="mb-3 text-sm font-semibold tracking-[1px] text-muted uppercase rtl:tracking-normal">{contentsLabel}</h2>
        <ol className="flex flex-col gap-1.5 text-sm" dir="ltr">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-navy-soft hover:text-teal-dark">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="flex min-w-0 flex-1 flex-col gap-8 rounded-3xl bg-white p-6 sm:p-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-extrabold sm:text-[40px]">{title}</h1>
          <p className="text-sm text-muted" dir="ltr">
            {meta}
          </p>
          {notices}
        </header>

        <div lang="en" dir="ltr" className="flex flex-col gap-9 text-[15px] leading-[1.75] text-navy-soft">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-6 flex-col gap-3">
              <h2 id={`${s.id}-title`} className="text-xl font-bold text-navy">
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
