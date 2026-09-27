/** Options and sample defaults for the teacher application wizard. */

/** Labels live in messages/<locale>/apply.json ("steps.<id>", "options.<group>.<id>"). */
export const steps = [{ id: "personal" }, { id: "professional" }, { id: "identity" }, { id: "video" }, { id: "review" }, { id: "approval" }] as const;
export type StepId = (typeof steps)[number]["id"];

export const subjects = ["businessEnglish", "conversation", "reading", "generalEnglish", "interviewPrep", "examPrep"] as const;
/** Students are 13+ (client decision): no children group. */
export const groups = ["adults", "teens", "corporate"] as const;
export const educationLevels = ["bachelor", "master", "phd", "associate", "other"] as const;
export const experienceLevels = ["lessThan1", "oneToTwo", "threeToFive", "fiveToTen", "tenPlus"] as const;
/** ISO 3166 region codes (names come from Intl.DisplayNames), plus "other". */
export const genders = ["female", "male", "undisclosed"] as const;
export const timeZones = [
  { value: "America/New_York", key: "newYork" },
  { value: "America/Chicago", key: "chicago" },
  { value: "America/Denver", key: "denver" },
  { value: "America/Phoenix", key: "phoenix" },
  { value: "America/Los_Angeles", key: "losAngeles" },
  { value: "America/Anchorage", key: "anchorage" },
  { value: "Pacific/Honolulu", key: "honolulu" },
  { value: "Europe/London", key: "london" },
  { value: "Europe/Madrid", key: "madrid" },
  { value: "Asia/Tokyo", key: "tokyo" },
] as const;
export const idTypes = ["passport", "license", "government"] as const;
export const interviewSlots = ["weekdayMornings", "weekdayAfternoons", "weekdayEvenings", "weekends"] as const;

export type Application = {
  photo: string[];
  /** Live mode: short profile title shown in search results (≤ 120 chars). */
  headline: string;
  /** Live mode: "About you" text (≤ 3000 chars). */
  bio: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Demo: ISO 3166-1 alpha-2 code. Live: English country name (as stored by the API). */
  country: string;
  gender: (typeof genders)[number] | "";
  timeZone: string;
  education: (typeof educationLevels)[number] | "";
  experience: (typeof experienceLevels)[number];
  subjects: (typeof subjects)[number][];
  /** Live mode: API specialties the wizard has no checkbox for (kept as they are on save). */
  otherSpecialties: string[];
  groups: (typeof groups)[number][];
  certifications: string[];
  certificateFiles: string[];
  languages: string[];
  rate: number;
  offersTrial: boolean;
  idType: (typeof idTypes)[number];
  idFiles: string[];
  video: string[];
  /** Live mode: link to the 2-minute introduction video (https). */
  videoUrl: string;
  interviewSlot: (typeof interviewSlots)[number] | "";
};

export const initialApplication: Application = {
  photo: [],
  headline: "",
  bio: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "US",
  gender: "",
  timeZone: "America/Chicago",
  education: "bachelor",
  experience: "fiveToTen",
  subjects: ["businessEnglish", "conversation", "interviewPrep"],
  otherSpecialties: [],
  groups: ["adults", "teens"],
  certifications: ["TESOL", "CELTA"],
  certificateFiles: [],
  // Sample tags typed by the applicant (user content, not translated).
  languages: ["English · Native", "Spanish · B2"],
  rate: 35,
  offersTrial: true,
  idType: "passport",
  idFiles: [],
  video: [],
  videoUrl: "",
  interviewSlot: "weekdayAfternoons",
};

/* ------------------------------------------------------------------ live mode (API) */

export type TeacherStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
export type IdentityStatus = "not_started" | "pending" | "verified" | "failed";

/** GET /teacher/profile (only the fields the application uses). */
export type TeacherProfile = {
  status: TeacherStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string | null;
  headline: string | null;
  bio: string | null;
  gender: "female" | "male" | "other" | null;
  timezone: string | null;
  education: string | null;
  yearsExperience: number | null;
  specialties: string[] | null;
  teaches: ("adults" | "teens")[] | null;
  languages: { language: string; level: string }[] | null;
  certifications: { name: string; fileUrl?: string | null }[] | null;
  priceCents: number | null;
  offersTrial: boolean | null;
  introVideoUrl: string | null;
  interviewPreference: (typeof interviewSlots)[number] | null;
  identityStatus: IdentityStatus;
  review: null | {
    decision: string | null;
    adminNotes: string | null;
    decidedAt: string | null;
    interviewRequestedAt: string | null;
    submittedAt: string | null;
  };
};

type Subject = (typeof subjects)[number];
/** Wizard subject ↔ API specialty names (exam prep covers both IELTS and TOEFL). */
const subjectSpecialties: Record<Subject, string[]> = {
  businessEnglish: ["Business English"],
  conversation: ["Conversation"],
  reading: ["Reading"],
  generalEnglish: ["General English"],
  interviewPrep: ["Interview Prep"],
  examPrep: ["IELTS Prep", "TOEFL Prep"],
};
const CORPORATE = "Corporate";
const knownSpecialties = new Set([...Object.values(subjectSpecialties).flat(), CORPORATE]);

const yearsByLevel: Record<(typeof experienceLevels)[number], number> = { lessThan1: 0, oneToTwo: 1, threeToFive: 3, fiveToTen: 5, tenPlus: 10 };
const levelOfYears = (y: number): Application["experience"] => (y >= 10 ? "tenPlus" : y >= 5 ? "fiveToTen" : y >= 3 ? "threeToFive" : y >= 1 ? "oneToTwo" : "lessThan1");

/** "Spanish · B2" ↔ { language: "Spanish", level: "B2" }. */
const languageTag = (l: { language: string; level: string }) => (l.level ? `${l.language} · ${l.level}` : l.language);
function parseLanguageTag(tag: string) {
  const parts = tag.split(/\s*[·•|]\s*/);
  if (parts.length > 1) return { language: parts[0].trim(), level: parts.slice(1).join(" ").trim() };
  // "Spanish B2" / "French native" without the separator.
  const m = tag.trim().match(/^(.+?)\s+([ABC][12]|native|fluent|basic|beginner|intermediate|advanced)$/i);
  return m ? { language: m[1], level: m[2] } : { language: tag.trim(), level: "" };
}

/** Wizard state from the saved profile (live mode: no sample defaults). */
export function applicationFromProfile(p: TeacherProfile): Application {
  const specialties = p.specialties ?? [];
  return {
    ...initialApplication,
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    country: p.country ?? "",
    // null = "prefer not to say"; "other" has no choice in the wizard.
    gender: p.gender === "female" || p.gender === "male" ? p.gender : p.gender === null ? "undisclosed" : "",
    timeZone: p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
    headline: p.headline ?? "",
    bio: p.bio ?? "",
    education: (educationLevels as readonly string[]).includes(p.education ?? "") ? (p.education as Application["education"]) : "",
    experience: levelOfYears(p.yearsExperience ?? 0),
    subjects: subjects.filter((s) => subjectSpecialties[s].some((name) => specialties.includes(name))),
    otherSpecialties: specialties.filter((s) => !knownSpecialties.has(s)),
    groups: [...groups.filter((g) => g !== "corporate" && (p.teaches ?? []).includes(g)), ...(specialties.includes(CORPORATE) ? (["corporate"] as const) : [])],
    certifications: (p.certifications ?? []).map((c) => c.name),
    languages: (p.languages ?? []).map(languageTag),
    rate: p.priceCents ? Math.min(50, Math.max(20, Math.round(p.priceCents / 100))) : 35,
    offersTrial: p.offersTrial ?? true,
    videoUrl: p.introVideoUrl ?? "",
    interviewSlot: p.interviewPreference ?? "",
  };
}

/** PUT /teacher/profile body for one wizard step (only that step's fields). */
export function stepPayload(step: StepId, a: Application): Record<string, unknown> | null {
  switch (step) {
    case "personal":
      return {
        firstName: a.firstName.trim(),
        lastName: a.lastName.trim(),
        phone: a.phone.trim(),
        ...(a.country ? { country: a.country } : {}),
        ...(a.gender ? { gender: a.gender === "undisclosed" ? null : a.gender } : {}),
        timezone: a.timeZone,
      };
    case "professional":
      return {
        headline: a.headline.trim(),
        bio: a.bio.trim(),
        ...(a.education ? { education: a.education } : {}),
        yearsExperience: yearsByLevel[a.experience],
        specialties: [...a.subjects.flatMap((s) => subjectSpecialties[s]), ...(a.groups.includes("corporate") ? [CORPORATE] : []), ...a.otherSpecialties],
        teaches: a.groups.filter((g): g is "adults" | "teens" => g !== "corporate"),
        certifications: a.certifications.map((name) => ({ name })),
        languages: a.languages.map(parseLanguageTag).filter((l) => l.language),
        priceCents: a.rate * 100,
        offersTrial: a.offersTrial,
      };
    case "video":
      return { introVideoUrl: a.videoUrl.trim() || null };
    case "review":
      return a.interviewSlot ? { interviewPreference: a.interviewSlot } : null;
    default:
      return null;
  }
}

/** Where a draft application resumes: the first step that still needs something. */
export function firstIncompleteStep(p: TeacherProfile): number {
  // Personal info counts as confirmed once the applicant saved it (phone) or moved on (headline).
  if (!p.firstName || !p.lastName || !p.country || !p.timezone || !(p.phone || p.headline)) return 0;
  if (!p.headline || !p.bio || !(p.specialties ?? []).length) return 1;
  if (p.identityStatus !== "pending" && p.identityStatus !== "verified") return 2;
  if (!p.introVideoUrl) return 3;
  return 4;
}

/** Statuses that let the applicant edit and (re)submit. */
export const editableStatus = (s: TeacherStatus) => s === "draft" || s === "rejected";

/** Embeddable player URL for YouTube / Vimeo links (other hosts: no preview). */
export function videoEmbedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const id = /^[\w-]{6,20}$/;
  if (host === "youtu.be") {
    const v = u.pathname.slice(1).split("/")[0];
    return id.test(v) ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === "youtube.com") {
    const v = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? "";
    return id.test(v) ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(\d{5,12})(?:\/([\da-f]{6,20}))?/);
    if (!m) return null;
    const hash = m[2] ?? u.searchParams.get("h");
    return `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ""}`;
  }
  return null;
}
