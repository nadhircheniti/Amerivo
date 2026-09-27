"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { cn } from "@/lib/cn";

const goals = [
  { id: "business", label: "Business", hint: "Meetings, emails, interviews" },
  { id: "travel", label: "Travel", hint: "Get around with ease" },
  { id: "university", label: "Education", hint: "School, university, exams" },
  { id: "immigration", label: "Immigration", hint: "Life and work in the U.S." },
  { id: "conversation", label: "Conversation", hint: "Speak naturally, every day" },
] as const;

type Level = "beginner" | "intermediate" | "advanced";
const levels: { value: Level; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const teacherPrefs = ["No preference", "Female", "Male"] as const;
const lessonTimes = ["Morning", "Afternoon", "Evening", "Weekend"] as const;

/** Selected state shared by tiles and pills (native input stays in the DOM, visually hidden). */
const selectable =
  "cursor-pointer border border-line bg-white text-navy has-[:checked]:border-2 has-[:checked]:border-teal-dark has-[:checked]:bg-teal-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal";

function Pill({ type, name, checked, onChange, children }: { type: "radio" | "checkbox"; name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className={cn(selectable, "inline-flex h-11 items-center rounded-full px-4 text-sm has-[:checked]:font-semibold")}>
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

function Group({ legend, children, className }: { legend: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-3.5", className)}>
      <legend className="mb-3.5 font-display text-[17px] font-bold">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function GoalsForm() {
  const [goal, setGoal] = useState<string>("business");
  const [level, setLevel] = useState<Level>("intermediate");
  const [teacher, setTeacher] = useState<string>("No preference");
  const [times, setTimes] = useState<string[]>(["Evening", "Weekend"]);

  const toggleTime = (t: string) => setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // TODO(api): persist answers to the student profile before moving on to the level test.
  return (
    <form className="flex flex-col gap-[30px]" onSubmit={(e) => e.preventDefault()}>
      <Group legend="Why are you learning English?">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {goals.map((g) => (
            <label key={g.id} className={cn(selectable, "flex min-h-[120px] flex-col items-start gap-1.5 rounded-2xl px-3.5 py-[18px] text-left")}>
              <input type="radio" name="goal" value={g.id} checked={goal === g.id} onChange={() => setGoal(g.id)} className="sr-only" />
              <span className="font-display text-[15px] font-bold">{g.label}</span>
              <span className="text-xs leading-snug text-muted">{g.hint}</span>
            </label>
          ))}
        </div>
      </Group>

      <div className="flex flex-col gap-3.5">
        <h2 className="text-[17px] font-bold">How would you describe your level?</h2>
        <Segmented label="Your English level" options={levels} value={level} onChange={setLevel} className="w-full max-w-[520px]" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Group legend="Preferred teacher">
          <div className="flex flex-wrap gap-2">
            {teacherPrefs.map((p) => (
              <Pill key={p} type="radio" name="teacher" checked={teacher === p} onChange={() => setTeacher(p)}>
                {p}
              </Pill>
            ))}
          </div>
        </Group>
        <Group legend="Preferred lesson times">
          <div className="flex flex-wrap gap-2">
            {lessonTimes.map((t) => (
              <Pill key={t} type="checkbox" name="times" checked={times.includes(t)} onChange={() => toggleTime(t)}>
                {t}
              </Pill>
            ))}
          </div>
        </Group>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-6">
        <Link href="/verify-email" className="text-[15px] font-semibold text-teal-dark hover:text-navy">
          Back
        </Link>
        <ButtonLink href="/onboarding/results" variant="teal" size="lg" className="px-9 font-bold">
          Continue to level test
        </ButtonLink>
      </div>
    </form>
  );
}
