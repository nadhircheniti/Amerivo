/**
 * Teacher data for the public pages: from the API when it is connected, otherwise the sample
 * teachers in mock-data.ts. Both are returned in the same `Teacher` shape used by the UI.
 */
import "server-only";
import { apiGet } from "./api";
import { getTeacher as getSampleTeacher, teachers as sampleTeachers, type Specialty, type Teacher } from "./mock-data";
import type { AvatarTone } from "@/components/ui/primitives";

/** Shape returned by GET /api/teachers and /api/teachers/:slug */
export type ApiTeacher = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  timezone: string;
  yearsExperience: number;
  specialties: string[];
  teaches: string[];
  languages: { language: string; level: string }[];
  certifications: { name: string }[];
  priceCents: number;
  offersTrial: boolean;
  offersPack5: boolean;
  offersPack10: boolean;
  ratingAvgX100: number;
  ratingCount: number;
  lessonsCompleted: number;
};

const TONES: AvatarTone[] = ["teal", "orange", "sky", "lilac", "yellow"];
const toneFor = (slug: string) => TONES[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

function tzAbbrev(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

export function fromApi(t: ApiTeacher): Teacher {
  const name = `${t.firstName} ${t.lastName}`.trim();
  const teaches = t.teaches.map((g) => (g === "teens" ? "Teens" : "Adults")) as Teacher["teaches"];
  return {
    slug: t.slug,
    name,
    shortName: `${t.firstName} ${t.lastName.charAt(0)}.`,
    initials: `${t.firstName.charAt(0)}${t.lastName.charAt(0)}`.toUpperCase(),
    tone: toneFor(t.slug),
    headline: t.headline ?? t.specialties[0] ?? "American English teacher",
    city: t.city ?? "United States",
    timezone: t.timezone,
    tzLabel: tzAbbrev(t.timezone),
    yearsExperience: t.yearsExperience,
    languages: t.languages.length ? t.languages.map((l) => `${l.language} (${l.level})`) : ["English (native)"],
    specialties: t.specialties as Specialty[],
    teaches: teaches.length ? teaches : ["Adults"],
    certifications: t.certifications.map((c) => c.name),
    priceUsd: t.priceCents / 100,
    offersTrial: t.offersTrial,
    offersPack5: t.offersPack5,
    offersPack10: t.offersPack10,
    rating: t.ratingAvgX100 / 100,
    reviewCount: t.ratingCount,
    lessonsCompleted: t.lessonsCompleted,
    summary: t.bio ?? t.headline ?? "",
  };
}

/** All approved teachers (API) or the sample list. */
export async function getTeachers(): Promise<{
  teachers: Teacher[];
  live: boolean;
}> {
  const data = await apiGet<ApiTeacher[]>("/teachers?limit=50");
  return data ? { teachers: data.map(fromApi), live: true } : { teachers: sampleTeachers, live: false };
}

export async function getTeacherBySlug(slug: string): Promise<Teacher | null> {
  const data = await apiGet<ApiTeacher>(`/teachers/${encodeURIComponent(slug)}`);
  if (data) return fromApi(data);
  return getSampleTeacher(slug) ?? null;
}
