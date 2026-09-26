import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { availabilityRules, studentProfiles, teacherProfiles, users } from "../../db/schema";
import { recommend, type Goal, type TimeBucket } from "../../domain/matching";

export interface PlacementInput {
  goal: Goal;
  selfLevel: "beginner" | "intermediate" | "advanced";
  preferredTeacherGender: "female" | "male" | "no_preference";
  preferredTimes: TimeBucket[];
}

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Cefr = (typeof CEFR)[number];

/** Overall level = rounded average of the four skills (spec §3 step 4). */
export function overallLevel(scores: Partial<Record<"grammar" | "reading" | "listening" | "speaking", Cefr>>): Cefr | null {
  const idx = Object.values(scores)
    .filter((v): v is Cefr => !!v)
    .map((v) => CEFR.indexOf(v));
  if (!idx.length) return null;
  return CEFR[Math.round(idx.reduce((a, b) => a + b, 0) / idx.length)];
}

/** Rough bucket of a teacher's weekly rules, used for matching (teacher time zone). */
function buckets(rules: { weekday: number; startMinute: number; endMinute: number }[]): TimeBucket[] {
  const out = new Set<TimeBucket>();
  for (const r of rules) {
    if (r.weekday >= 6) out.add("weekend");
    if (r.startMinute < 12 * 60) out.add("morning");
    if (r.startMinute < 17 * 60 && r.endMinute > 12 * 60) out.add("afternoon");
    if (r.endMinute > 17 * 60) out.add("evening");
  }
  return [...out];
}

@Injectable()
export class StudentsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  savePlacement(studentId: string, p: PlacementInput) {
    return this.db
      .insert(studentProfiles)
      .values({ userId: studentId, ...p })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: p })
      .returning();
  }

  async saveTestResult(studentId: string, scores: Partial<Record<"grammar" | "reading" | "listening" | "speaking", Cefr>>) {
    const level = overallLevel(scores);
    const [row] = await this.db
      .insert(studentProfiles)
      .values({ userId: studentId, placementScores: scores, cefrLevel: level })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { placementScores: scores, cefrLevel: level } })
      .returning();
    return row;
  }

  async recommendations(studentId: string) {
    const [profile] = await this.db.select().from(studentProfiles).where(eq(studentProfiles.userId, studentId));
    const teachers = await this.db
      .select({ id: teacherProfiles.userId, slug: teacherProfiles.slug, firstName: users.firstName, lastName: users.lastName, specialties: teacherProfiles.specialties, yearsExperience: teacherProfiles.yearsExperience, ratingAvgX100: teacherProfiles.ratingAvg, ratingCount: teacherProfiles.ratingCount, gender: teacherProfiles.gender, priceCents: teacherProfiles.priceCents })
      .from(teacherProfiles)
      .innerJoin(users, eq(users.id, teacherProfiles.userId))
      .where(and(eq(teacherProfiles.status, "approved"), eq(teacherProfiles.vacationMode, false)));
    const rules = await this.db.select().from(availabilityRules);
    const ranked = recommend(
      teachers.map((t) => ({ ...t, ratingAvg: t.ratingAvgX100 / 100, openBuckets: buckets(rules.filter((r) => r.teacherId === t.id)) })),
      { goal: profile?.goal ?? null, preferredTimes: (profile?.preferredTimes ?? []) as TimeBucket[], preferredGender: profile?.preferredTeacherGender === "other" ? null : profile?.preferredTeacherGender },
    );
    return ranked.map((r) => ({ ...r, teacher: teachers.find((t) => t.id === r.teacherId)! }));
  }
}
