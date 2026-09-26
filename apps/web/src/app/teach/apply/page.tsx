import type { Metadata } from "next";
import { FocusHeader } from "@/components/layout/focus-header";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/primitives";
import { ApplyWizard } from "./_components/apply-wizard";

export const metadata: Metadata = {
  title: "Teach on Amerivo",
  description: "Apply to teach American English online with Amerivo. Set your own rate, get paid monthly.",
};

const faqs = [
  {
    q: "How much can I earn?",
    a: "You set your own rate between $20 and $50 per 50-minute lesson. Amerivo keeps a 20% platform commission, so at $35 you receive $28.00 per lesson. You can also offer 5- and 10-lesson packages.",
  },
  {
    q: "When and how do I get paid?",
    a: "Payouts are sent monthly, by the 28th, through Stripe Connect to your bank account. Each payout covers the lessons completed in the previous period.",
  },
  {
    q: "Who can apply?",
    a: "Amerivo teachers are U.S. native English speakers. A teaching certification (TESOL, TEFL or CELTA) or classroom experience is strongly recommended, and every applicant completes ID verification and a short interview.",
  },
  {
    q: "What equipment do I need?",
    a: "A computer with a webcam, a headset or good microphone, a stable internet connection (10 Mbps or faster) and a quiet, well-lit space. Lessons run in the browser — no software to install.",
  },
];

export default function TeachApplyPage() {
  return (
    <div className="min-h-dvh bg-beige">
      <FocusHeader brandSuffix="for Teachers" right={{ href: "/", label: "Save & exit" }} />

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-20 lg:py-11">
        <ApplyWizard />

        <section id="faq" aria-labelledby="faq-heading" className="mt-16 scroll-mt-8 lg:mt-20">
          <div className="mb-6 flex flex-col gap-2">
            <Eyebrow>Teacher FAQ</Eyebrow>
            <h2 id="faq-heading" className="text-[28px] font-extrabold">
              Questions before you apply
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-3xl bg-white p-6 open:shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Icon name="chevronRight" size={20} className="shrink-0 text-teal-dark transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-navy-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
