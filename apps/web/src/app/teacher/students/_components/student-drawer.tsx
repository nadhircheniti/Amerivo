"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { fileSrc } from "@/components/ui/file-upload";
import { Icon } from "@/components/ui/icon";
import { Avatar, Badge, type BadgeTone } from "@/components/ui/primitives";
import { intlTags, type Locale } from "@/i18n/config";
import { API_URL, ApiError } from "@/lib/api";
import { zoneAbbrev } from "@/lib/time-zone";
import { useSpaceTimeZone } from "@/lib/use-time-zone";
import { initialsOf, toneOf } from "../../_components/use-load";
import type { LessonStatus, StudentDetail, StudentLesson, StudentRow } from "../_data";
import { useCountryName } from "./students-view";

const statusTone: Record<LessonStatus, BadgeTone> = { confirmed: "info", completed: "success", no_show: "warning", cancelled: "neutral", refunded: "danger" };

/** Side panel (modal dialog) with a student's details and lesson history with this teacher. */
export function StudentDrawer({ id, row, loadDetail, onClose }: { id: string | null; row: StudentRow | null; loadDetail: (id: string) => Promise<StudentDetail>; onClose: () => void }) {
  const t = useTranslations("teacher.students");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  // Lessons are shown in the teacher's own zone (their profile), like on the dashboard.
  const tz = useSpaceTimeZone();
  const country = useCountryName();
  const ref = useRef<HTMLDialogElement>(null);
  // Keyed by student id so a previous student's data never shows while the next one loads.
  const [loaded, setLoaded] = useState<{ id: string; detail?: StudentDetail; error?: string } | null>(null);
  const detail = loaded?.id === id ? (loaded.detail ?? null) : null;
  const error = loaded?.id === id ? (loaded.error ?? null) : null;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (id && !d.open) d.showModal();
    if (!id && d.open) d.close();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadDetail(id)
      .then((d) => !cancelled && setLoaded({ id, detail: d }))
      .catch((e) => !cancelled && setLoaded({ id, error: e instanceof ApiError && e.status && e.status !== 404 ? e.message : t("detailError") }));
    return () => {
      cancelled = true;
    };
  }, [id, loadDetail, attempt, t]);

  const date = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) =>
    new Intl.DateTimeFormat(tag, { ...opts, timeZone: API_URL ? tz : "UTC" }).format(new Date(iso)) + (API_URL && opts.hour ? ` ${zoneAbbrev(tz, iso)}` : "");
  const typeLabel = (l: StudentLesson) => (l.type === "trial" ? t("typeTrial") : l.type === "package" ? t("typePackage") : t("typeSingle"));
  const person = detail?.student ?? row;
  const name = person ? `${person.firstName} ${person.lastName}`.trim() : "";
  const tg = useTranslations("teacher.students.goals");

  return (
    <dialog
      ref={ref}
      aria-labelledby="student-drawer-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 ms-auto h-dvh max-h-dvh w-full max-w-[480px] overflow-y-auto bg-beige p-0 text-navy backdrop:bg-navy/40"
    >
      {person && (
        <div className="flex min-h-full flex-col gap-5 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <Avatar initials={initialsOf(person.firstName, person.lastName)} tone={toneOf(person.id)} size={64} src={fileSrc(person.avatarUrl)} />
            <div className="flex min-w-0 grow flex-col gap-1">
              <h2 id="student-drawer-title" className="text-[22px] font-extrabold">
                {name}
              </h2>
              <p className="text-sm text-muted">{[country(person.country), person.level ? t("level", { level: person.level }) : null].filter(Boolean).join(" · ")}</p>
              {person.goal && <p className="text-sm">{t("goal", { goal: tg(person.goal) })}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-full p-2 hover:bg-white">
              <Icon name="x" size={18} strokeWidth={2.2} />
            </button>
          </div>

          <ButtonLink href={`/teacher/messages?student=${encodeURIComponent(person.id)}`} variant="teal" size="sm" className="self-start">
            <Icon name="message" size={16} />
            {t("messageButton", { name: person.firstName })}
          </ButtonLink>

          {detail ? (
            <>
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { label: t("statLessons"), value: detail.lessonsCompleted.toLocaleString(tag) },
                  { label: t("statHours"), value: detail.hours.toLocaleString(tag) },
                  { label: t("statUpcoming"), value: detail.upcoming.toLocaleString(tag) },
                  { label: t("statPack"), value: detail.packageRemaining.toLocaleString(tag) },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-1 rounded-2xl bg-white p-4">
                    <dt className="text-[13px] text-muted">{s.label}</dt>
                    <dd className="font-display text-2xl font-extrabold">{s.value}</dd>
                  </div>
                ))}
              </dl>

              <section aria-labelledby="history-title" className="flex flex-col gap-3">
                <h3 id="history-title" className="text-[17px] font-bold">
                  {t("history")}
                </h3>
                {detail.lessons.length === 0 ? (
                  <p className="text-sm text-muted">{t("noHistory")}</p>
                ) : (
                  <ol className="flex flex-col gap-2.5">
                    {detail.lessons.map((l) => (
                      <li key={l.bookingId} className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{date(l.startsAt)}</span>
                          <Badge tone={statusTone[l.status]}>{t(`status.${l.status}`)}</Badge>
                        </div>
                        <p className="text-[13px] text-muted">{[typeLabel(l), t("minutes", { count: l.durationMin }), l.topic].filter(Boolean).join(" · ")}</p>
                        {l.report ? (
                          <div className="flex flex-col gap-1 rounded-xl bg-beige px-3 py-2.5 text-[13px] leading-normal">
                            <p>
                              <strong>{t("topics")}</strong> {l.report.topicsCovered}
                            </p>
                            {l.report.homework && (
                              <p>
                                <strong>{t("homework")}</strong> {l.report.homework}
                              </p>
                            )}
                            {l.report.recommendation && (
                              <p>
                                <strong>{t("nextTopic")}</strong> {l.report.recommendation}
                              </p>
                            )}
                          </div>
                        ) : (l.status === "completed" || l.status === "no_show") && API_URL ? (
                          <Link href={`/teacher/lessons/${l.bookingId}/report`} className="self-start text-[13px] font-semibold text-teal-dark hover:text-navy">
                            {t("writeReport")}
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          ) : error ? (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-sm text-orange-text">
                {error}
              </p>
              <Button variant="teal" size="sm" onClick={() => {
                  setLoaded(null);
                  setAttempt((n) => n + 1);
                }}>
                {t("retry")}
              </Button>
            </div>
          ) : (
            <p role="status" className="text-sm text-muted">
              {t("loadingDetail")}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
