/** Shapes of GET /teacher/profile used by the schedule screen (see the API contract). */

/** A weekly window: weekday 1 = Monday … 7 = Sunday, minutes since midnight in the teacher's time zone. */
export type AvailabilityRule = { weekday: number; startMinute: number; endMinute: number };

/** A blocked range of days (inclusive, "YYYY-MM-DD"). */
export type BlockedDate = { id: string; startDate: string; endDate: string; reason: string | null };

export type TeacherSchedule = {
  timezone: string;
  availability: AvailabilityRule[];
  blockedDates: BlockedDate[];
  priceCents: number;
  offersTrial: boolean;
  offersPack5: boolean;
  offersPack10: boolean;
  vacationMode: boolean;
};

export type LessonSettingsPatch = Pick<TeacherSchedule, "priceCents" | "offersTrial" | "offersPack5" | "offersPack10">;
