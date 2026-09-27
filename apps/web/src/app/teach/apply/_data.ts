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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** ISO 3166-1 alpha-2 code of the country of residence. */
  country: string;
  gender: (typeof genders)[number] | "";
  timeZone: string;
  education: (typeof educationLevels)[number];
  experience: (typeof experienceLevels)[number];
  subjects: (typeof subjects)[number][];
  groups: (typeof groups)[number][];
  certifications: string[];
  certificateFiles: string[];
  languages: string[];
  rate: number;
  offersTrial: boolean;
  idType: (typeof idTypes)[number];
  idFiles: string[];
  video: string[];
  interviewSlot: (typeof interviewSlots)[number];
};

export const initialApplication: Application = {
  photo: [],
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
  interviewSlot: "weekdayAfternoons",
};
