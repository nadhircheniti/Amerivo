/** Shapes of GET /teacher/students and GET /teacher/students/:id, plus sample data for demo mode. */

export type Goal = "business" | "travel" | "university" | "immigration" | "conversation";

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  /** English country name, as stored by the API. */
  country: string | null;
  avatarUrl: string | null;
  level: string | null;
  goal: Goal | null;
  lessonsCompleted: number;
  hours: number;
  upcoming: number;
  nextLessonAt: string | null;
  lastLessonAt: string | null;
  firstBookedAt: string | null;
  hadTrial: boolean;
  packageRemaining: number;
};

export type LessonStatus = "confirmed" | "completed" | "no_show" | "cancelled" | "refunded";

export type StudentLesson = {
  bookingId: string;
  startsAt: string;
  durationMin: number;
  type: "trial" | "single" | "package";
  status: LessonStatus;
  topic: string | null;
  attendance: "attended" | "late" | "no_show" | null;
  report: null | {
    topicsCovered: string;
    strengths: string | null;
    developmentAreas: string | null;
    homework: string | null;
    homeworkDue: string | null;
    recommendation: string | null;
    sentAt: string | null;
  };
};

export type StudentDetail = {
  student: Pick<StudentRow, "id" | "firstName" | "lastName" | "country" | "avatarUrl" | "level" | "goal"> & { nativeLanguage?: string | null; timezone?: string | null };
  lessonsCompleted: number;
  hours: number;
  upcoming: number;
  nextLessonAt: string | null;
  lastLessonAt: string | null;
  packageRemaining: number;
  lessons: StudentLesson[];
};

/* ------------------------------------------------------------------ demo */
const row = (p: Partial<StudentRow> & Pick<StudentRow, "id" | "firstName" | "lastName">): StudentRow => ({
  country: null,
  avatarUrl: null,
  level: null,
  goal: null,
  lessonsCompleted: 0,
  hours: 0,
  upcoming: 0,
  nextLessonAt: null,
  lastLessonAt: null,
  firstBookedAt: null,
  hadTrial: false,
  packageRemaining: 0,
  ...p,
});

export const sampleStudents: StudentRow[] = [
  row({ id: "s-maria", firstName: "Maria", lastName: "Silva", country: "Brazil", level: "B1", goal: "business", lessonsCompleted: 11, hours: 9.2, upcoming: 2, nextLessonAt: "2026-10-14T16:00:00Z", lastLessonAt: "2026-10-09T16:00:00Z", packageRemaining: 3 }),
  row({ id: "s-kenji", firstName: "Kenji", lastName: "Tanaka", country: "Japan", level: "A2", goal: "immigration", upcoming: 1, nextLessonAt: "2026-10-14T19:00:00Z", hadTrial: true }),
  row({ id: "s-lucas", firstName: "Lucas", lastName: "Moreau", country: "France", level: "B2", goal: "conversation", lessonsCompleted: 4, hours: 3.3, upcoming: 1, nextLessonAt: "2026-10-14T22:30:00Z", lastLessonAt: "2026-10-13T16:00:00Z" }),
  row({ id: "s-ana", firstName: "Ana", lastName: "Costa", country: "Portugal", level: "B1", goal: "travel", lessonsCompleted: 6, hours: 5, lastLessonAt: "2026-10-12T15:00:00Z", packageRemaining: 9 }),
  row({ id: "s-omar", firstName: "Omar", lastName: "Haddad", country: "Morocco", level: "C1", goal: "university", lessonsCompleted: 14, hours: 11.7, lastLessonAt: "2026-08-28T17:00:00Z" }),
];

/** Sample history for the drawer (demo mode). */
export function sampleDetail(id: string): StudentDetail {
  const s = sampleStudents.find((x) => x.id === id) ?? sampleStudents[0];
  const lessons: StudentLesson[] = [];
  if (s.nextLessonAt) lessons.push({ bookingId: `${s.id}-next`, startsAt: s.nextLessonAt, durationMin: s.hadTrial ? 20 : 50, type: s.hadTrial ? "trial" : "single", status: "confirmed", topic: null, attendance: null, report: null });
  if (s.lastLessonAt) {
    lessons.push({
      bookingId: `${s.id}-last`,
      startsAt: s.lastLessonAt,
      durationMin: 50,
      type: s.packageRemaining ? "package" : "single",
      status: "completed",
      topic: null,
      attendance: "attended",
      report: {
        topicsCovered: "Leading a team meeting: opening, agenda items, summarizing.",
        strengths: "Confident tone, good structure.",
        developmentAreas: "Past simple vs present perfect.",
        homework: "Write a 150-word meeting agenda.",
        homeworkDue: null,
        recommendation: "Negotiation phrases; role-play a budget discussion.",
        sentAt: s.lastLessonAt,
      },
    });
  }
  const { id: sid, firstName, lastName, country, avatarUrl, level, goal } = s;
  return {
    student: { id: sid, firstName, lastName, country, avatarUrl, level, goal },
    lessonsCompleted: s.lessonsCompleted,
    hours: s.hours,
    upcoming: s.upcoming,
    nextLessonAt: s.nextLessonAt,
    lastLessonAt: s.lastLessonAt,
    packageRemaining: s.packageRemaining,
    lessons,
  };
}
