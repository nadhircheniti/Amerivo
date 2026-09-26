import type { AvatarTone } from "@/components/ui/primitives";

export type ThreadItem =
  | { id: string; kind: "day"; label: string }
  | { id: string; kind: "text"; from: "me" | "them"; text: string }
  | { id: string; kind: "file"; from: "me" | "them"; name: string; meta: string }
  | { id: string; kind: "homework"; from: "me"; title: string; file: string };

export type Conversation = {
  id: string;
  name: string;
  initials: string;
  tone: AvatarTone;
  online?: boolean;
  status: string;
  time: string;
  preview: string;
  unread?: boolean;
  teacherSlug?: string;
  subtitle: string;
  nextLesson?: { id: string; label: string };
  sharedFiles: string[];
  together?: string;
  thread: ThreadItem[];
};

/** Sample conversations for the UI milestone (TODO(api): /conversations). */
export const conversations: Conversation[] = [
  {
    id: "sarah-mitchell",
    name: "Sarah Mitchell",
    initials: "SM",
    tone: "teal",
    online: true,
    status: "Online · Austin, 11:44",
    time: "17:42",
    preview: "See you at 18:00! I shared the…",
    teacherSlug: "sarah-mitchell",
    subtitle: "Business English · 4.9",
    nextLesson: { id: "l-1014", label: "Join 18:00 lesson" },
    sharedFiles: ["Meeting-agenda-template.pdf", "Phrasal verbs worksheet.docx", "Lesson notes – Oct 9.pdf"],
    together: "11 lessons · 9.2 hours",
    thread: [
      { id: "d1", kind: "day", label: "Today" },
      { id: "m1", kind: "text", from: "them", text: "Hi Maria! For today's lesson we'll practice leading a team meeting. Could you look at the agenda template before class?" },
      { id: "m2", kind: "file", from: "them", name: "Meeting-agenda-template.pdf", meta: "PDF · 240 KB" },
      { id: "m3", kind: "text", from: "me", text: "Thanks Sarah! I read it. I also finished the homework from last week." },
      { id: "m4", kind: "homework", from: "me", title: "Homework submitted", file: "Phrasal verbs worksheet.docx" },
      { id: "m5", kind: "text", from: "them", text: "Great job! See you at 18:00." },
    ],
  },
  {
    id: "james-robinson",
    name: "James Robinson",
    initials: "JR",
    tone: "orange",
    status: "Last seen Tue · Chicago",
    time: "Tue",
    preview: "Here's the podcast link for Monday",
    unread: true,
    teacherSlug: "james-robinson",
    subtitle: "Conversation · 4.8",
    sharedFiles: ["Small talk phrases.pdf"],
    together: "6 lessons · 5.0 hours",
    thread: [
      { id: "d1", kind: "day", label: "Tuesday" },
      { id: "m1", kind: "text", from: "them", text: "Here's the podcast link for Monday. Listen to the first 15 minutes and answer the 5 questions." },
      { id: "m2", kind: "file", from: "them", name: "Podcast questions.pdf", meta: "PDF · 96 KB" },
    ],
  },
  {
    id: "support",
    name: "Amerivo Support",
    initials: "A",
    tone: "sand",
    status: "Usually replies within a few hours",
    time: "Oct 2",
    preview: "Welcome to Amerivo English!",
    subtitle: "Help with bookings, payments and your account",
    sharedFiles: [],
    thread: [
      { id: "d1", kind: "day", label: "Oct 2" },
      { id: "m1", kind: "text", from: "them", text: "Welcome to Amerivo English! If you need help with a booking, a payment or your account, just reply here." },
    ],
  },
];
