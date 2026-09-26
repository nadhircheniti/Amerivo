/**
 * Teacher recommendations after placement (spec §3 step 5): availability, experience,
 * specialization, rating and student goals. Returns teachers sorted by score with the
 * human-readable reasons shown on the "Teachers recommended for you" screen.
 */
export type Goal = "business" | "travel" | "university" | "immigration" | "conversation";
export type TimeBucket = "morning" | "afternoon" | "evening" | "weekend";

export interface MatchTeacher {
  id: string;
  specialties: string[];
  yearsExperience: number;
  ratingAvg: number; // 0–5
  ratingCount: number;
  gender?: string | null;
  /** Buckets (in the STUDENT's time zone) in which the teacher has open slots */
  openBuckets: TimeBucket[];
}

export interface MatchStudent {
  goal?: Goal | null;
  preferredTimes: TimeBucket[];
  preferredGender?: "female" | "male" | "no_preference" | null;
}

const goalSpecialties: Record<Goal, string[]> = {
  business: ["Business English", "Interview Prep", "Corporate"],
  travel: ["Conversation", "Travel"],
  university: ["IELTS Prep", "TOEFL Prep", "Reading"],
  immigration: ["Conversation", "General English", "Interview Prep"],
  conversation: ["Conversation", "General English"],
};

export function scoreTeacher(t: MatchTeacher, s: MatchStudent) {
  const reasons: string[] = [];
  let score = 0;

  if (s.goal) {
    const wanted = goalSpecialties[s.goal];
    const hit = t.specialties.find((sp) => wanted.includes(sp));
    if (hit) {
      score += 40;
      reasons.push(`${hit} specialist`);
    }
  }

  const overlap = s.preferredTimes.filter((b) => t.openBuckets.includes(b));
  if (s.preferredTimes.length && overlap.length) {
    score += 25 * (overlap.length / s.preferredTimes.length);
    reasons.push(`Available in your preferred times (${overlap.join(", ")})`);
  }

  if (s.preferredGender && s.preferredGender !== "no_preference" && t.gender && t.gender !== s.preferredGender) {
    score -= 30;
  }

  // Bayesian-smoothed rating so one 5★ review doesn't beat fifty 4.9★ reviews.
  const prior = 4.5;
  const weight = 5;
  const smoothed = (t.ratingAvg * t.ratingCount + prior * weight) / (t.ratingCount + weight);
  score += (smoothed / 5) * 25;

  score += Math.min(t.yearsExperience, 10);
  if (t.yearsExperience >= 8) reasons.push(`${t.yearsExperience} years of experience`);

  return { score: Math.round(score * 10) / 10, reasons };
}

export function recommend(teachers: MatchTeacher[], student: MatchStudent, limit = 3) {
  return teachers
    .map((t) => ({ teacherId: t.id, ...scoreTeacher(t, student) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
