"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { useDueLabel, useToggleHomework } from "../_components/homework-list";
import { EmptyState, Loadable, PageHeader } from "../_components/states";
import { TeacherAvatar } from "../_components/teacher-avatar";
import { demoHomework } from "../_lib/demo";
import { fullName, useFormat } from "../_lib/format";
import type { HomeworkRow, HomeworkStatus } from "../_lib/types";
import { useNow, useStudentData } from "../_lib/use-student-data";

type Filter = "todo" | "done" | "all";

export function HomeworkView() {
  const t = useTranslations("student.homework");
  const state = useStudentData<HomeworkRow[]>("/student/homework", () => demoHomework());
  const [filter, setFilter] = useState<Filter>("todo");
  const now = useNow();
  const { setData } = state;
  const onChange = useCallback((id: string, status: HomeworkStatus) => setData((rows) => rows?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null), [setData]);
  const { toggle, busy, error } = useToggleHomework(onChange);

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader title={t("title")} description={t("description")} />
      <Loadable state={state}>
        {(rows) => {
          const todo = rows.filter((r) => r.status !== "completed");
          const done = rows.filter((r) => r.status === "completed");
          const shown = filter === "todo" ? todo : filter === "done" ? done : rows;
          return (
            <>
              <Segmented
                label={t("filterLabel")}
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "todo", label: t("filters.todo", { count: todo.length }) },
                  { value: "done", label: t("filters.done", { count: done.length }) },
                  { value: "all", label: t("filters.all") },
                ]}
                className="max-w-md"
              />
              {error && (
                <p className="text-sm text-danger-text" role="alert">
                  {error}
                </p>
              )}
              {shown.length === 0 ? (
                <EmptyState
                  icon="book"
                  title={filter === "todo" && rows.length > 0 ? t("empty.allDoneTitle") : t("empty.title")}
                  text={filter === "todo" && rows.length > 0 ? t("empty.allDoneText") : t("empty.text")}
                />
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {shown.map((hw) => (
                    <HomeworkCard key={hw.id} hw={hw} now={now} busy={busy === hw.id} onToggle={(v) => toggle(hw, v)} />
                  ))}
                </ul>
              )}
            </>
          );
        }}
      </Loadable>
    </div>
  );
}

function HomeworkCard({ hw, now, busy, onToggle }: { hw: HomeworkRow; now: number | null; busy: boolean; onToggle: (done: boolean) => void }) {
  const t = useTranslations("student.homework");
  const f = useFormat();
  const dueLabel = useDueLabel();
  const done = hw.status === "completed";
  const due = now === null ? null : dueLabel(hw.dueDate, now);
  return (
    <li className={cn("flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6", done ? "bg-white/70" : due?.urgent ? "bg-cream" : "bg-white")}>
      <TeacherAvatar teacher={hw.teacher} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn("text-[15px] font-semibold whitespace-pre-line", done && "text-muted line-through")}>{hw.description}</p>
        <p className="text-[13px] text-muted">
          {t("fromTeacher", { name: fullName(hw.teacher) })}
          {hw.lessonDate && hw.bookingId && (
            <>
              {" · "}
              <Link href={`/student/lessons/${hw.bookingId}`} className="font-semibold text-teal-dark hover:text-navy">
                {t("lessonOf", { date: f.date(hw.lessonDate) })}
              </Link>
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {done ? (
            <Badge tone="success">
              <Icon name="check" size={12} strokeWidth={2.6} />
              {t("completed")}
            </Badge>
          ) : (
            <>
              {hw.status === "submitted" && <Badge tone="info">{t("submitted")}</Badge>}
              {due && <Badge tone={due.urgent ? "warning" : "neutral"}>{due.text}</Badge>}
            </>
          )}
        </div>
      </div>
      <Button size="sm" variant={done ? "outlineLight" : "teal"} disabled={busy} onClick={() => onToggle(!done)} aria-pressed={done}>
        {done ? t("markNotDone") : t("markDone")}
      </Button>
    </li>
  );
}
