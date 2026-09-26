/** Options and sample defaults for the teacher application wizard. */

export const steps = [
  { id: "personal", title: "Personal info", heading: "Personal information" },
  { id: "professional", title: "Professional info", heading: "Professional information" },
  { id: "identity", title: "Identity verification", heading: "Identity verification" },
  { id: "video", title: "Video introduction", heading: "Video introduction" },
  { id: "review", title: "Review & interview", heading: "Review & interview" },
  { id: "approval", title: "Approval", heading: "Application status" },
] as const;

export const subjects = ["Business English", "Conversation (Speaking)", "Reading", "General English", "Interview Preparation", "IELTS / TOEFL Prep"];
/** Students are 13+ (client decision): no children group. */
export const groups = ["Adults", "Teens (13–17)", "Corporate groups"];
export const educationLevels = ["Bachelor's degree", "Master's degree", "PhD", "Associate degree", "Other"];
export const experienceLevels = ["Less than 1 year", "1–2 years", "3–5 years", "5–10 years", "10+ years"];
export const countries = ["United States", "Canada", "Mexico", "United Kingdom", "Spain", "Portugal", "Germany", "Japan", "Other"];
export const genders = ["Female", "Male", "Prefer not to say"];
export const timeZones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Madrid", label: "Central Europe (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
];
export const idTypes = [
  { value: "passport", label: "Passport" },
  { value: "license", label: "Driver's license" },
  { value: "government", label: "Government ID" },
] as const;
export const interviewSlots = ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends"];

export type Application = {
  photo: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  gender: string;
  timeZone: string;
  education: string;
  experience: string;
  subjects: string[];
  groups: string[];
  certifications: string[];
  certificateFiles: string[];
  languages: string[];
  rate: number;
  offersTrial: boolean;
  idType: (typeof idTypes)[number]["value"];
  idFiles: string[];
  video: string[];
  interviewSlot: string;
};

export const initialApplication: Application = {
  photo: [],
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "United States",
  gender: "",
  timeZone: "America/Chicago",
  education: "Bachelor's degree",
  experience: "5–10 years",
  subjects: ["Business English", "Conversation (Speaking)", "Interview Preparation"],
  groups: ["Adults", "Teens"],
  certifications: ["TESOL", "CELTA"],
  certificateFiles: [],
  languages: ["English · Native", "Spanish · B2"],
  rate: 35,
  offersTrial: true,
  idType: "passport",
  idFiles: [],
  video: [],
  interviewSlot: "Weekday afternoons",
};
