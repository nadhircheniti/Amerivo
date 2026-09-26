/**
 * Sample data for the UI milestone. Every page reads from here so the screens can be
 * swapped to the real API (apps/api) one module at a time.
 * Names, times and amounts are placeholders — nothing here is real platform data.
 */
import type { AvatarTone } from "@/components/ui/primitives";

export type Specialty =
  | "Business English"
  | "Conversation"
  | "Interview Prep"
  | "IELTS Prep"
  | "TOEFL Prep"
  | "Teens"
  | "General English"
  | "Travel"
  | "Corporate";

export type Teacher = {
  slug: string;
  name: string;
  shortName: string;
  initials: string;
  tone: AvatarTone;
  headline: string;
  city: string;
  timezone: string; // IANA
  tzLabel: string;
  yearsExperience: number;
  languages: string[];
  specialties: Specialty[];
  /** Students are 13+ (client decision) — no children. */
  teaches: ("Adults" | "Teens")[];
  certifications: string[];
  priceUsd: number; // per 50-min lesson, $20–$50
  offersTrial: boolean; // free 20-min trial, opt-in per teacher
  offersPack5: boolean; // 5% off
  offersPack10: boolean; // 10% off
  rating: number;
  summary: string;
};

export const teachers: Teacher[] = [
  {
    slug: "sarah-mitchell",
    name: "Sarah Mitchell",
    shortName: "Sarah M.",
    initials: "SM",
    tone: "teal",
    headline: "Business English & Interview Coach",
    city: "Austin, TX",
    timezone: "America/Chicago",
    tzLabel: "CST",
    yearsExperience: 8,
    languages: ["English (native)", "Spanish (B2)"],
    specialties: ["Business English", "Interview Prep", "Conversation"],
    teaches: ["Adults", "Teens"],
    certifications: ["TESOL (120h)", "B.A. Communications"],
    priceUsd: 35,
    offersTrial: true,
    offersPack5: true,
    offersPack10: true,
    rating: 4.9,
    summary: "Former HR manager. I help professionals prepare for interviews, meetings and presentations with confidence.",
  },
  {
    slug: "amanda-lee",
    name: "Amanda Lee",
    shortName: "Amanda L.",
    initials: "AL",
    tone: "sky",
    headline: "IELTS & TOEFL Specialist",
    city: "Boston, MA",
    timezone: "America/New_York",
    tzLabel: "EST",
    yearsExperience: 12,
    languages: ["English (native)", "French (C1)"],
    specialties: ["IELTS Prep", "TOEFL Prep", "Business English"],
    teaches: ["Adults"],
    certifications: ["CELTA", "M.Ed. TESOL"],
    priceUsd: 45,
    offersTrial: true,
    offersPack5: true,
    offersPack10: true,
    rating: 5.0,
    summary: "CELTA certified. Structured IELTS and TOEFL preparation with mock tests and detailed feedback.",
  },
  {
    slug: "james-robinson",
    name: "James Robinson",
    shortName: "James R.",
    initials: "JR",
    tone: "orange",
    headline: "Conversation & Travel English",
    city: "Chicago, IL",
    timezone: "America/Chicago",
    tzLabel: "CST",
    yearsExperience: 5,
    languages: ["English (native)", "Portuguese (B1)"],
    specialties: ["Conversation", "Business English", "Travel"],
    teaches: ["Adults", "Teens"],
    certifications: ["TEFL (150h)"],
    priceUsd: 28,
    offersTrial: true,
    offersPack5: true,
    offersPack10: false,
    rating: 4.8,
    summary: "Relaxed, practical conversation lessons for business travel and everyday American English.",
  },
  {
    slug: "michael-brooks",
    name: "Michael Brooks",
    shortName: "Michael B.",
    initials: "MB",
    tone: "lilac",
    headline: "Corporate & Negotiation English",
    city: "Seattle, WA",
    timezone: "America/Los_Angeles",
    tzLabel: "PST",
    yearsExperience: 10,
    languages: ["English (native)", "Arabic (B2)"],
    specialties: ["Business English", "Corporate"],
    teaches: ["Adults"],
    certifications: ["MBA", "TESOL"],
    priceUsd: 50,
    offersTrial: false,
    offersPack5: false,
    offersPack10: true,
    rating: 4.9,
    summary: "MBA and ex-consultant. Negotiation, email writing and presentation skills for global teams.",
  },
  {
    slug: "david-king",
    name: "David King",
    shortName: "David K.",
    initials: "DK",
    tone: "lilac",
    headline: "English for Teens",
    city: "Denver, CO",
    timezone: "America/Denver",
    tzLabel: "MST",
    yearsExperience: 3,
    languages: ["English (native)"],
    specialties: ["Teens", "General English"],
    teaches: ["Teens"],
    certifications: ["TEFL (120h)"],
    priceUsd: 22,
    offersTrial: true,
    offersPack5: true,
    offersPack10: true,
    rating: 4.7,
    summary: "Dynamic, game-based lessons that build confidence for teenagers (13+).",
  },
];

export const getTeacher = (slug: string) => teachers.find((t) => t.slug === slug);

/** Package pricing rule from the spec: 5 lessons −5%, 10 lessons −10% (teacher opt-in). */
export function packagePrice(unit: number, count: 1 | 5 | 10) {
  const discount = count === 5 ? 0.05 : count === 10 ? 0.1 : 0;
  return Math.round(unit * count * (1 - discount) * 100) / 100;
}

/** Platform commission from the spec: 20%. */
export const PLATFORM_COMMISSION = 0.2;
export const teacherNet = (gross: number) => Math.round(gross * (1 - PLATFORM_COMMISSION) * 100) / 100;

export const formatUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ----- Signed-in sample users ----- */
export const currentStudent = { name: "Maria Silva", firstName: "Maria", initials: "MS", tone: "yellow" as AvatarTone, level: "B1" as const, timezone: "Europe/Zurich" };
export const currentTeacher = teachers[0];

export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Cefr = (typeof cefrLevels)[number];

export type LessonStatus = "PENDING_PAYMENT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
