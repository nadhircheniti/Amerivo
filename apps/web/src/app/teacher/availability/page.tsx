import type { Metadata } from "next";
import { currentTeacher } from "@/lib/mock-data";
import { ModeToggle } from "../_components/mode-toggle";
import { AvailabilityGrid } from "./_components/availability-grid";
import { BlockedDates } from "./_components/blocked-dates";
import { LessonSettings } from "./_components/lesson-settings";

export const metadata: Metadata = { title: "Schedule & availability · Amerivo English" };

export default function AvailabilityPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 xl:flex-row">
      <AvailabilityGrid />

      <aside aria-label="Availability settings" className="flex w-full shrink-0 flex-col gap-5 xl:w-80">
        <section aria-labelledby="modes-heading" className="flex flex-col gap-3.5 rounded-3xl bg-white p-6">
          <h2 id="modes-heading" className="text-[17px] font-bold">
            Modes
          </h2>
          <ModeToggle label="Vacation mode" variant="row" />
          <ModeToggle label="Holiday mode" variant="row" />
          <p className="text-[13px] leading-normal text-muted">Hides your calendar from new bookings. Existing lessons stay confirmed.</p>
        </section>
        <BlockedDates />
        <LessonSettings price={currentTeacher.priceUsd} pack5={currentTeacher.offersPack5} pack10={currentTeacher.offersPack10} />
      </aside>
    </div>
  );
}
