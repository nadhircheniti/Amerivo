/** Placement test shapes returned by the API (/student/placement…). Answer keys only come back after the test. */
export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Cefr = (typeof CEFR)[number];
export const SECTIONS = ["grammar", "reading", "listening", "speaking"] as const;
export type Section = (typeof SECTIONS)[number];
export type Goal = "business" | "travel" | "university" | "immigration" | "conversation";
export type SelfLevel = "beginner" | "intermediate" | "advanced";
export type TimeBucket = "morning" | "afternoon" | "evening" | "weekend";

export type PublicQuestion = { id: string; prompt: string; options: [string, string, string, string] };
type StageBase = { section: Section; stageIndex: number; sectionIndex: number; answered: number };
export type Stage =
  | (StageBase & { kind: "grammar"; questions: PublicQuestion[] })
  | (StageBase & { kind: "reading"; passage: { title: string; text: string }; questions: PublicQuestion[] })
  | (StageBase & { kind: "listening"; clip: { context: string; script: string; rate: number }; questions: PublicQuestion[] })
  | (StageBase & { kind: "speaking"; statements: { level: Cefr; statement: string }[] });

export type SkillResult = { level: Cefr | null; correct: number; total: number; skipped?: boolean; selfAssessed?: boolean };
export type PlacementResult = { overall: Cefr; skills: Record<Section, SkillResult> };

export type PlacementStatus = {
  goal: Goal | null;
  selfLevel: SelfLevel | null;
  preferredTeacherGender: "female" | "male" | "other" | "no_preference" | null;
  preferredTimes: TimeBucket[];
  status: "not_started" | "skipped" | "completed";
  level: Cefr | null;
  scores: Partial<Record<Section, Cefr>>;
  completedAt: string | null;
  inProgress: { attemptId: string; sectionIndex: number; startedAt: string } | null;
  lastResult: PlacementResult | null;
};

export type StartResponse = { attemptId: string; stage: Stage };
export type AnswerResponse = { attemptId: string; done: false; stage: Stage } | { attemptId: string; done: true; result: PlacementResult };

export type ReviewQuestion = PublicQuestion & { chosen: number | null; answer: number; explanation: string; isCorrect: boolean };
export type ReviewSection = {
  section: Exclude<Section, "speaking">;
  level: Cefr;
  correct: number;
  total: number;
  passage: { title: string; text: string } | null;
  transcript: { context: string; script: string } | null;
  questions: ReviewQuestion[];
};
export type Review = { attemptId: string; completedAt: string; result: PlacementResult; sections: ReviewSection[] };

export type ReasonCode =
  { id: "specialist"; specialty: string } | { id: "times"; buckets: TimeBucket[] } | { id: "experience"; years: number } | { id: "topRated"; rating: number };
export type Recommendation = {
  teacherId: string;
  score: number;
  codes: ReasonCode[];
  teacher: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string;
    headline: string | null;
    avatarUrl: string | null;
    priceCents: number;
    ratingAvgX100: number;
    ratingCount: number;
    yearsExperience: number;
    offersTrial: boolean;
  };
};
