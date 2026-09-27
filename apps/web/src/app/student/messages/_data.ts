import type { AvatarTone } from "@/components/ui/primitives";

/**
 * A sample moment, formatted in the viewer's language by the UI:
 * "today", a clock time ("17:42"), a weekday (0 = Sunday) or a calendar day.
 */
export type SampleWhen = "today" | { time: string } | { weekday: number } | { month: number; day: number };

export type ThreadItem =
  | { id: string; kind: "day"; when: SampleWhen }
  | { id: string; kind: "text"; from: "me" | "them"; text: string }
  | { id: string; kind: "file"; from: "me" | "them"; name: string; size: number }
  | { id: string; kind: "homework"; from: "me"; file: string };

export type Presence = { online: true; city: string; localTime: string } | { lastSeen: SampleWhen; city: string } | { repliesWithinHours: true };

export type Conversation = {
  id: string;
  name: string;
  initials: string;
  tone: AvatarTone;
  online?: boolean;
  presence: Presence;
  time: SampleWhen;
  preview: string;
  unread?: boolean;
  teacherSlug?: string;
  /** Teacher: main specialty + rating. Support: fixed subtitle. */
  subtitle: { specialty: string; rating: number } | "support";
  nextLesson?: { id: string; time: string };
  sharedFiles: string[];
  together?: { lessons: number; hours: number };
  thread: ThreadItem[];
};

/** Sample conversations for demo mode (live mode uses the messaging API). */
export const conversations: Conversation[] = [
  {
    id: "sarah-mitchell",
    name: "Sarah Mitchell",
    initials: "SM",
    tone: "teal",
    online: true,
    presence: { online: true, city: "Austin", localTime: "11:44" },
    time: { time: "17:42" },
    preview: "See you at 18:00! I shared the…",
    teacherSlug: "sarah-mitchell",
    subtitle: { specialty: "Business English", rating: 4.9 },
    nextLesson: { id: "l-1014", time: "18:00" },
    sharedFiles: ["Meeting-agenda-template.pdf", "Phrasal verbs worksheet.docx", "Lesson notes – Oct 9.pdf"],
    together: { lessons: 11, hours: 9.2 },
    thread: [
      { id: "d1", kind: "day", when: "today" },
      { id: "m1", kind: "text", from: "them", text: "Hi Maria! For today's lesson we'll practice leading a team meeting. Could you look at the agenda template before class?" },
      { id: "m2", kind: "file", from: "them", name: "Meeting-agenda-template.pdf", size: 240 * 1024 },
      { id: "m3", kind: "text", from: "me", text: "Thanks Sarah! I read it. I also finished the homework from last week." },
      { id: "m4", kind: "homework", from: "me", file: "Phrasal verbs worksheet.docx" },
      { id: "m5", kind: "text", from: "them", text: "Great job! See you at 18:00." },
    ],
  },
  {
    id: "james-robinson",
    name: "James Robinson",
    initials: "JR",
    tone: "orange",
    presence: { lastSeen: { weekday: 2 }, city: "Chicago" },
    time: { weekday: 2 },
    preview: "Here's the podcast link for Monday",
    unread: true,
    teacherSlug: "james-robinson",
    subtitle: { specialty: "Conversation", rating: 4.8 },
    sharedFiles: ["Small talk phrases.pdf"],
    together: { lessons: 6, hours: 5 },
    thread: [
      { id: "d1", kind: "day", when: { weekday: 2 } },
      { id: "m1", kind: "text", from: "them", text: "Here's the podcast link for Monday. Listen to the first 15 minutes and answer the 5 questions." },
      { id: "m2", kind: "file", from: "them", name: "Podcast questions.pdf", size: 96 * 1024 },
    ],
  },
  {
    id: "support",
    name: "Amerivo Support",
    initials: "A",
    tone: "sand",
    presence: { repliesWithinHours: true },
    time: { month: 10, day: 2 },
    preview: "Welcome to Amerivo English!",
    subtitle: "support",
    sharedFiles: [],
    thread: [
      { id: "d1", kind: "day", when: { month: 10, day: 2 } },
      { id: "m1", kind: "text", from: "them", text: "Welcome to Amerivo English! If you need help with a booking, a payment or your account, just reply here." },
    ],
  },
];
