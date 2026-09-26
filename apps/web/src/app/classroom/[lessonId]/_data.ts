/**
 * Sample data for the live classroom. Swap for the lessons API (apps/api) when it exists.
 */
import { currentStudent, currentTeacher } from "@/lib/mock-data";

export type ChatMessage = { id: string; from: "teacher" | "me"; text: string };
export type SharedFile = { id: string; name: string; kind: "PDF" | "MP3" | "DOC" | "IMG" | "FILE" };

export type ClassroomLesson = {
  id: string;
  title: string;
  durationMin: number;
  teacher: { name: string; firstName: string; initials: string };
  student: { name: string; firstName: string; initials: string };
  boardTitle: string;
  phrases: { text: string; highlight?: boolean }[];
  notes: string;
  files: SharedFile[];
  chat: ChatMessage[];
};

export function getClassroomLesson(lessonId: string): ClassroomLesson {
  return {
    id: lessonId,
    title: "Business English · Leading a team meeting",
    durationMin: 50,
    teacher: { name: currentTeacher.name, firstName: currentTeacher.name.split(" ")[0], initials: currentTeacher.initials },
    student: { name: currentStudent.name, firstName: currentStudent.firstName, initials: currentStudent.initials },
    boardTitle: "Meeting phrases",
    phrases: [
      { text: "“Let’s get started.”" },
      { text: "“The main item on the agenda is…”" },
      { text: "“Could we come back to that later?”" },
      { text: "“To sum up, …”", highlight: true },
    ],
    notes:
      "New vocabulary\n• agenda item\n• to table a topic\n• action points\n\nCorrections\n• “I have presented” → “I presented” (yesterday)",
    files: [
      { id: "f1", name: "Meeting-agenda-template.pdf", kind: "PDF" },
      { id: "f2", name: "Listening-clip-01.mp3", kind: "MP3" },
    ],
    chat: [
      { id: "m1", from: "teacher", text: "Try: “Could we come back to that later?”" },
      { id: "m2", from: "me", text: "Could we come back to that later?" },
      { id: "m3", from: "teacher", text: "Perfect! Very natural." },
    ],
  };
}
