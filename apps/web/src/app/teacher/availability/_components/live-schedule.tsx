"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";
import { VacationToggle } from "../../_components/vacation-toggle";
import { LiveAvailabilityGrid } from "./availability-grid";
import { BlockedDates } from "./blocked-dates";
import { LessonSettings } from "./lesson-settings";
import type { AvailabilityRule, BlockedDate, LessonSettingsPatch, TeacherSchedule } from "./types";

/** Live mode of the schedule page: loads GET /teacher/profile once, then each card saves its own part. */
export function LiveSchedule() {
  const t = useTranslations("teacher.availability");
  const { call, isLoaded, isSignedIn } = useApi();
  const [profile, setProfile] = useState<TeacherSchedule | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    call<TeacherSchedule>("/teacher/profile")
      .then((p) => !cancelled && (setProfile(p), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [call, isLoaded, isSignedIn, attempt]);

  const saveRules = useCallback(
    async (rules: AvailabilityRule[]) => {
      await call("/teacher/availability", { method: "PUT", body: JSON.stringify({ rules }) });
    },
    [call],
  );
  const saveSettings = useCallback(
    async (patch: LessonSettingsPatch) => {
      await call("/teacher/profile", { method: "PUT", body: JSON.stringify(patch) });
    },
    [call],
  );
  const addBlocked = useCallback(
    (b: { startDate: string; endDate: string; reason?: string }) => call<BlockedDate>("/teacher/blocked-dates", { method: "POST", body: JSON.stringify(b) }),
    [call],
  );
  const removeBlocked = useCallback(
    async (id: string) => {
      await call(`/teacher/blocked-dates/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    [call],
  );

  if (!profile) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-10">
        <section aria-labelledby="availability-heading" className="flex flex-col items-start gap-3 rounded-3xl bg-white p-5 sm:p-[26px]">
          <h1 id="availability-heading" className="text-2xl font-extrabold sm:text-[26px]">
            {t("grid.title")}
          </h1>
          {failed ? (
            <>
              <p role="alert" className="text-sm text-orange-text">
                {t("live.loadError")}
              </p>
              <Button
                variant="teal"
                size="sm"
                onClick={() => {
                  setFailed(false);
                  setAttempt((n) => n + 1);
                }}
              >
                {t("live.retry")}
              </Button>
            </>
          ) : (
            <p role="status" className="text-sm text-muted">
              {t("live.loading")}
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 xl:flex-row">
      <LiveAvailabilityGrid timezone={profile.timezone} rules={profile.availability} onSave={saveRules} />

      <aside aria-label={t("settingsLabel")} className="flex w-full shrink-0 flex-col gap-5 xl:w-80">
        <section aria-labelledby="modes-heading" className="flex flex-col gap-3.5 rounded-3xl bg-white p-6">
          <h2 id="modes-heading" className="text-[17px] font-bold">
            {t("modesTitle")}
          </h2>
          <VacationToggle initial={profile.vacationMode} variant="row" />
          <p className="text-[13px] leading-normal text-muted">{t("modesHint")}</p>
        </section>
        <BlockedDates live={{ items: profile.blockedDates, onAdd: addBlocked, onRemove: removeBlocked }} />
        <LessonSettings price={Math.round(profile.priceCents / 100)} trial={profile.offersTrial} pack5={profile.offersPack5} pack10={profile.offersPack10} onSave={saveSettings} />
      </aside>
    </div>
  );
}
