/**
 * Teacher data for the public pages: from the API when it is connected, otherwise the sample
 * teachers in mock-data.ts. Both are returned in the same `Teacher` shape used by the UI.
 */
import "server-only";
import { apiGet } from "./api";
import { fileSrc } from "./files";
import { getTeacher as getSampleTeacher, teachers as sampleTeachers, type Specialty, type Teacher } from "./mock-data";
import type { AvatarTone } from "@/components/ui/primitives";

/** Shape returned by GET /api/teachers and /api/teachers/:slug */
export type ApiTeacher = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  /** "/api/files/<id>" (public profile photo) or null. */
  avatarUrl: string | null;
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
  /** YouTube/Vimeo/Loom/Google Drive page URL, only when it can be embedded (the API checks it). */
  introVideoUrl: string | null;
  /** Player URL computed by the API from introVideoUrl. */
  introVideoEmbedUrl: string | null;
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

/** Texts used when a teacher left a field empty. Server pages pass translated versions; English by default. */
export type TeacherFallbacks = { headline: string; city: string };
const defaultFallbacks: TeacherFallbacks = { headline: "American English teacher", city: "United States" };

export function fromApi(t: ApiTeacher, fallbacks: TeacherFallbacks = defaultFallbacks): Teacher {
  const name = `${t.firstName} ${t.lastName}`.trim();
  const teaches = t.teaches.map((g) => (g === "teens" ? "Teens" : "Adults")) as Teacher["teaches"];
  return {
    slug: t.slug,
    name,
    shortName: `${t.firstName} ${t.lastName.charAt(0)}.`,
    initials: `${t.firstName.charAt(0)}${t.lastName.charAt(0)}`.toUpperCase(),
    tone: toneFor(t.slug),
    headline: t.headline ?? t.specialties[0] ?? fallbacks.headline,
    city: t.city ?? fallbacks.city,
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
    photoUrl: fileSrc(t.avatarUrl),
    // Older API versions don't send the player URL: no video rather than an unchecked link.
    videoEmbedUrl: t.introVideoEmbedUrl ?? null,
  };
}

/** All approved teachers (API) or the sample list. */
export async function getTeachers(fallbacks?: TeacherFallbacks): Promise<{
  teachers: Teacher[];
  live: boolean;
}> {
  const data = await apiGet<ApiTeacher[]>("/teachers?limit=50");
  return data ? { teachers: data.map((d) => fromApi(d, fallbacks)), live: true } : { teachers: sampleTeachers, live: false };
}

/**
 * Teachers for the home page: complete profiles first (photo, then intro video), then the best
 * rated and the newest — chosen by the API so new teachers appear as soon as they are approved.
 */
export async function getFeaturedTeachers(count: number, fallbacks?: TeacherFallbacks): Promise<Teacher[]> {
  const data = await apiGet<ApiTeacher[]>(`/teachers?sort=featured&limit=${count}`);
  if (data) return data.map((d) => fromApi(d, fallbacks));
  // Demo mode: the four sample teachers of the design.
  const picked = SAMPLE_FEATURED.map((s) => sampleTeachers.find((t) => t.slug === s)).filter((t): t is Teacher => Boolean(t));
  return [...picked, ...sampleTeachers.filter((t) => !picked.includes(t))].slice(0, count);
}
const SAMPLE_FEATURED = ["sarah-mitchell", "james-robinson", "amanda-lee", "david-king"];

export async function getTeacherBySlug(slug: string, fallbacks?: TeacherFallbacks): Promise<Teacher | null> {
  const data = await apiGet<ApiTeacher>(`/teachers/${encodeURIComponent(slug)}`);
  if (data) return fromApi(data, fallbacks);
  return getSampleTeacher(slug) ?? null;
}
