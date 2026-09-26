import type { Metadata } from "next";
import { FocusHeader } from "@/components/layout/focus-header";
import { Card } from "@/components/ui/primitives";
import { ChoiceTile } from "@/components/ui/form";
import { GoalsForm } from "./goals-form";

export const metadata: Metadata = { title: "Your goals" };

const sections = ["Grammar", "Reading", "Listening", "Speaking"];

export default function GoalsPage() {
  return (
    <>
      <FocusHeader center="Step 3 of 4 · Your goals" right={{ href: "/student", label: "Save & finish later" }} progress={62} />
      <main className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-20 lg:py-12">
        <Card className="flex w-full min-w-0 flex-1 flex-col gap-[30px] p-6 sm:p-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-extrabold sm:text-[32px]">Tell us about your goals</h1>
            <p className="text-base text-navy-soft">We use your answers to recommend the right teachers.</p>
          </div>
          <GoalsForm />
        </Card>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]" aria-label="About the level test">
          <div className="flex flex-col gap-[18px] rounded-3xl bg-navy p-8 text-white">
            <span className="font-display text-xs font-semibold tracking-[3px] text-yellow">NEXT · LEVEL TEST</span>
            <h2 className="text-2xl font-bold text-white">About 15 minutes</h2>
            <p className="text-[15px] leading-relaxed text-ink-soft">Four short sections give you a CEFR level from A1 to C2, saved to your profile.</p>
            <ul className="grid grid-cols-2 gap-2.5">
              {sections.map((s) => (
                <li key={s} className="rounded-[14px] bg-white/8 p-4 text-[15px] font-semibold">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <Card className="p-7">
            <fieldset className="flex flex-col gap-3.5">
              <legend className="mb-3.5 text-[13px] font-semibold tracking-[1px] text-muted">SAMPLE QUESTION · GRAMMAR</legend>
              <p className="text-[17px] leading-normal font-medium">If I ___ more time, I would travel to New York.</p>
              {["have", "had", "will have"].map((a) => (
                <ChoiceTile key={a} type="radio" name="sample" defaultChecked={a === "had"} className="px-3.5 py-3 text-[15px]">
                  {a}
                </ChoiceTile>
              ))}
            </fieldset>
          </Card>
        </aside>
      </main>
    </>
  );
}
