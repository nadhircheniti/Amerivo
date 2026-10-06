"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApi } from "@/lib/use-api";
import type { PlacementStatus } from "../_lib/types";

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
  const router = useRouter();
  const { call, isLoaded, isSignedIn } = useApi();
  const [goal, setGoal] = useState<string>("business");
  const [level, setLevel] = useState<Level>("intermediate");
  const [teacher, setTeacher] = useState<string>("none");
  const [times, setTimes] = useState<string[]>(["evening", "weekend"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTime = (id: string) => setTimes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Pre-fill with what the student already answered (coming back from the dashboard).
  useEffect(() => {
    if (!API_URL || !isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<PlacementStatus>("/student/placement")
      .then((p) => {
        if (cancelled || !p.goal) return;
        setGoal(p.goal);
        if (p.selfLevel) setLevel(p.selfLevel);
        setTeacher(p.preferredTeacherGender === "female" || p.preferredTeacherGender === "male" ? p.preferredTeacherGender : "none");
        setTimes(p.preferredTimes);
      })
      .catch(() => undefined); // keep the defaults
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn]);

  async function save() {
    if (!API_URL) return router.push("/onboarding/test");
    setSaving(true);
    setError(null);
    try {
      await call("/student/placement", {
        method: "PUT",
        body: JSON.stringify({ goal, selfLevel: level, preferredTeacherGender: teacher === "none" ? "no_preference" : teacher, preferredTimes: times }),
      });
      router.push("/onboarding/test");
    } catch {
      setError(t("saveError"));
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-[30px]"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
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

      {error && (
        <p role="alert" className="rounded-2xl bg-danger-100 px-5 py-4 text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-6">
        <Link href="/student" className="text-[15px] font-semibold text-teal-dark hover:text-navy">
          {t("back")}
        </Link>
        <Button type="submit" variant="teal" size="lg" className="px-9 font-bold" disabled={saving}>
          {saving ? t("saving") : t("continue")}
        </Button>
      </div>
    </form>
  );
}
