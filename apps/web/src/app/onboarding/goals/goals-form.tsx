"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { cn } from "@/lib/cn";

const goals = ["business", "travel", "university", "immigration", "conversation"] as const;

type Level = "beginner" | "intermediate" | "advanced";
const levels: Level[] = ["beginner", "intermediate", "advanced"];

const teacherPrefs = ["none", "female", "male"] as const;
const lessonTimes = ["morning", "afternoon", "evening", "weekend"] as const;

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
  const t = useTranslations("onboarding.goals");
  const [goal, setGoal] = useState<string>("business");
  const [level, setLevel] = useState<Level>("intermediate");
  const [teacher, setTeacher] = useState<string>("none");
  const [times, setTimes] = useState<string[]>(["evening", "weekend"]);

  const toggleTime = (id: string) => setTimes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // TODO(api): persist answers to the student profile before moving on to the level test.
  return (
    <form className="flex flex-col gap-[30px]" onSubmit={(e) => e.preventDefault()}>
      <Group legend={t("whyLegend")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {goals.map((g) => (
            <label key={g} className={cn(selectable, "flex min-h-[120px] flex-col items-start gap-1.5 rounded-2xl px-3.5 py-[18px] text-start")}>
              <input type="radio" name="goal" value={g} checked={goal === g} onChange={() => setGoal(g)} className="sr-only" />
              <span className="font-display text-[15px] font-bold">{t(`goals.${g}`)}</span>
              <span className="text-xs leading-snug text-muted">{t(`goals.${g}Hint`)}</span>
            </label>
          ))}
        </div>
      </Group>

      <div className="flex flex-col gap-3.5">
        <h2 className="text-[17px] font-bold">{t("levelQuestion")}</h2>
        <Segmented
          label={t("levelLabel")}
          options={levels.map((value) => ({ value, label: t(`levels.${value}`) }))}
          value={level}
          onChange={setLevel}
          className="w-full max-w-[520px]"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Group legend={t("teacherLegend")}>
          <div className="flex flex-wrap gap-2">
            {teacherPrefs.map((p) => (
              <Pill key={p} type="radio" name="teacher" checked={teacher === p} onChange={() => setTeacher(p)}>
                {t(`teacherPrefs.${p}`)}
              </Pill>
            ))}
          </div>
        </Group>
        <Group legend={t("timesLegend")}>
          <div className="flex flex-wrap gap-2">
            {lessonTimes.map((id) => (
              <Pill key={id} type="checkbox" name="times" checked={times.includes(id)} onChange={() => toggleTime(id)}>
                {t(`times.${id}`)}
              </Pill>
            ))}
          </div>
        </Group>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-6">
        <Link href="/verify-email" className="text-[15px] font-semibold text-teal-dark hover:text-navy">
          {t("back")}
        </Link>
        <ButtonLink href="/onboarding/results" variant="teal" size="lg" className="px-9 font-bold">
          {t("continue")}
        </ButtonLink>
      </div>
    </form>
  );
}
