import { Logo } from "@/components/ui/logo";
import { Icon } from "@/components/ui/icon";

const perks = ["Free placement test (A1–C2)", "Teachers matched to your goals", "Live video lessons, no download"];

/** Navy brand panel shown on the left of every auth screen (collapses to a slim bar on mobile). */
export function BrandPanel() {
  return (
    <div className="relative flex shrink-0 flex-col overflow-hidden bg-navy px-6 py-6 text-white lg:sticky lg:top-0 lg:h-screen lg:w-[560px] lg:p-14">
      <div aria-hidden="true" className="absolute top-[180px] -right-[120px] hidden size-[360px] rounded-full bg-teal opacity-25 lg:block" />
      <div aria-hidden="true" className="absolute -bottom-[120px] -left-[100px] hidden size-80 rounded-full bg-orange opacity-30 lg:block" />
      <Logo onDark size="md" className="relative" />
      <div className="relative mt-auto hidden flex-col gap-[22px] lg:flex">
        <p className="font-display text-[46px] leading-[1.1] font-extrabold text-white">
          Speak English
          <br />
          with Confidence
        </p>
        <p className="text-lg leading-relaxed text-ink-soft">Flexible lessons. Real conversations. Lasting results.</p>
        <ul className="mt-2.5 flex flex-col gap-3.5 text-base">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-white/12">
                <Icon name="check" size={16} strokeWidth={2.4} className="text-yellow" />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-6 -rotate-4 font-hand text-[40px] text-yellow">New language. More opportunities.</p>
      </div>
    </div>
  );
}
