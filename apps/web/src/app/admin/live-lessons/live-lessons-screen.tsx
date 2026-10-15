"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { deviceTimeZone, zoneAbbrev } from "@/lib/time-zone";
import { LoadGate, PageShell, StaleError, fullName, panel } from "../_components/live/ui";
import { useAdminData } from "../_components/live/use-admin-data";

type Person = { id: string; firstName: string; lastName: string };
export type LiveLesson = {
  bookingId: string;
  type: "trial" | "single" | "package";
  topic: string | null;
  startsAt: string;
  durationMin: number;
  opensAt: string;
  closesAt: string;
  teacher: Person;
  student: Person;
  /** When the teacher first entered the classroom (null: not yet). */
  teacherJoinedAt: string | null;
};

const REFRESH_MS = 30_000;

const sample: LiveLesson[] = [
  {
    bookingId: "demo-live-1",
    type: "single",
    topic: "Job interview practice",
    startsAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    durationMin: 50,
    opensAt: new Date(Date.now() - 17 * 60_000).toISOString(),
    closesAt: new Date(Date.now() + 38 * 60_000).toISOString(),
    teacher: { id: "t1", firstName: "Sarah", lastName: "Mitchell" },
    student: { id: "s1", firstName: "Maria", lastName: "Silva" },
    teacherJoinedAt: new Date(Date.now() - 14 * 60_000).toISOString(),
  },
];

/**
 * Lessons whose classroom is open now. "Observe" opens the classroom as a visible observer:
 * both people see "Amerivo quality team", camera and microphone start off (Terms §7).
 */
export function LiveLessonsScreen() {
  const t = useTranslations("admin.liveLessonsPage");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const tz = deviceTimeZone();
  const [now, setNow] = useState(() => Date.now());
  const { data, error, retrying, reload } = useAdminData<LiveLesson[]>("/admin/live-lessons", sample);

  // The list changes by itself: lessons start and end.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      reload();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [reload]);

  const time = (iso: string) => new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

  return (
    <PageShell title={t("title")} subtitle={t("subtitle")}>
      <p className="flex items-start gap-2.5 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-deep">
        <Icon name="shieldCheck" size={18} className="mt-0.5 shrink-0" />
        {t("rules")}
      </p>
      <LoadGate data={data} error={error} retrying={retrying} reload={reload} what={t("what")}>
        {(list) => (
          <section className={panel} aria-labelledby="live-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="live-heading" className="text-lg font-bold">
                {t("listTitle", { count: list.length })}
              </h2>
              <p className="text-xs text-muted">{t("timesIn", { tz: `${tz.replace(/_/g, " ")} (${zoneAbbrev(tz)})` })}</p>
            </div>
            <StaleError error={error} reload={reload} retrying={retrying} />
            {list.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t("empty")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {list.map((l) => {
                  const start = new Date(l.startsAt).getTime();
                  const end = start + l.durationMin * 60_000;
                  const state = now < start ? "starting" : "inProgress";
                  const elapsed = Math.max(0, Math.floor((now - start) / 60_000));
                  return (
                    <li key={l.bookingId} className="flex flex-col gap-3 rounded-2xl bg-beige p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {t("pair", { teacher: fullName(l.teacher), student: fullName(l.student) })}
                          <Badge tone={state === "inProgress" ? "success" : "warning"}>{state === "inProgress" ? t("inProgress", { minutes: elapsed }) : t("starting")}</Badge>
                          {l.type === "trial" && <Badge tone="info">{t("trial")}</Badge>}
                        </p>
                        <p className="text-sm text-navy-soft">
                          <bdi dir="ltr">
                            {time(l.startsAt)}–{time(new Date(end).toISOString())}
                          </bdi>
                          {l.topic ? ` · ${l.topic}` : ""}
                        </p>
                        <p className="text-[13px] text-muted">{l.teacherJoinedAt ? t("teacherIn", { time: time(l.teacherJoinedAt) }) : t("teacherNotYet")}</p>
                      </div>
                      <ButtonLink href={`/classroom/${l.bookingId}`} variant="teal" size="sm" className="shrink-0 self-start sm:self-center">
                        <Icon name="video" size={16} />
                        {t("observe")}
                      </ButtonLink>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </LoadGate>
    </PageShell>
  );
}
