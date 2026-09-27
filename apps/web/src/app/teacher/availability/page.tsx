import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { API_URL } from "@/lib/api";
import { currentTeacher } from "@/lib/mock-data";
import { ModeToggle } from "../_components/mode-toggle";
import { AvailabilityGrid } from "./_components/availability-grid";
import { BlockedDates } from "./_components/blocked-dates";
import { LessonSettings } from "./_components/lesson-settings";
import { LiveSchedule } from "./_components/live-schedule";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.availability");
  return { title: t("metaTitle") };
}

export default function AvailabilityPage() {
  const t = useTranslations("teacher.availability");
  const tm = useTranslations("teacher.modes");

  // Connected to the API: the teacher's real schedule and settings.
  if (API_URL) return <LiveSchedule />;

  // Demo mode: sample data, nothing is saved.
  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 xl:flex-row">
      <AvailabilityGrid />

      <aside aria-label={t("settingsLabel")} className="flex w-full shrink-0 flex-col gap-5 xl:w-80">
        <section aria-labelledby="modes-heading" className="flex flex-col gap-3.5 rounded-3xl bg-white p-6">
          <h2 id="modes-heading" className="text-[17px] font-bold">
            {t("modesTitle")}
          </h2>
          <ModeToggle label={tm("vacation")} variant="row" />
          <ModeToggle label={tm("holiday")} variant="row" />
          <p className="text-[13px] leading-normal text-muted">{t("modesHint")}</p>
        </section>
        <BlockedDates />
        <LessonSettings price={currentTeacher.priceUsd} trial={currentTeacher.offersTrial} pack5={currentTeacher.offersPack5} pack10={currentTeacher.offersPack10} />
      </aside>
    </div>
  );
}
