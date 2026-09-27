/** Sample data for the teacher's post-lesson report. Swap for the lessons API when it exists. */
import { currentStudent } from "@/lib/mock-data";

export type ReportDraft = {
  attendance: "attended" | "late" | "no-show";
  topics: string;
  strengths: string;
  development: string;
  homework: string;
  dueDate: string; // yyyy-mm-dd
  recommendation: string;
  fluency: number;
  accuracy: number;
  engagement: number;
};

export function getLessonForReport(lessonId: string) {
  return {
    id: lessonId,
    student: { name: currentStudent.name, firstName: currentStudent.firstName },
    date: "2026-10-14", // yyyy-mm-dd
    durationMin: 50,
    returning: { lessons: 11, hours: 9.2 },
    draft: <ReportDraft>{
      attendance: "attended",
      topics: "Leading a team meeting: opening, agenda items, postponing a topic, summarizing.",
      strengths: "Confident tone, good structure, uses linking words well.",
      development: "Past simple vs present perfect; pronunciation of -ed endings.",
      homework: "Write a 150-word meeting agenda for your next team call.",
      dueDate: "2026-10-15",
      recommendation: "Negotiation phrases; role-play a budget discussion.",
      fluency: 3,
      accuracy: 3,
      engagement: 5,
    },
  };
}

export type ReportLesson = ReturnType<typeof getLessonForReport>;
