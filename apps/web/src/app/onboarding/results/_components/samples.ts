import type { PlacementStatus, Recommendation, Review } from "../../_lib/types";

/** Demo mode (no API): what the result screen looks like after a finished test. */
export const sampleStatus: PlacementStatus = {
  goal: "business",
  selfLevel: "intermediate",
  preferredTeacherGender: "no_preference",
  preferredTimes: ["evening"],
  status: "completed",
  level: "B1",
  scores: { grammar: "B1", reading: "B2", listening: "B1", speaking: "A2" },
  completedAt: "2026-10-06T10:00:00Z",
  inProgress: null,
  lastResult: {
    overall: "B1",
    skills: {
      grammar: { level: "B1", correct: 8, total: 12 },
      reading: { level: "B2", correct: 7, total: 9 },
      listening: { level: "B1", correct: 5, total: 9 },
      speaking: { level: "A2", correct: 0, total: 0, selfAssessed: true },
    },
  },
};

export const sampleReview: Review = {
  attemptId: "demo",
  completedAt: "2026-10-06T10:00:00Z",
  result: sampleStatus.lastResult!,
  sections: [
    {
      section: "grammar",
      level: "B1",
      correct: 2,
      total: 3,
      passage: null,
      transcript: null,
      questions: [
        {
          id: "demo-1",
          prompt: "If I ___ more time, I would travel to New York.",
          options: ["have", "had", "will have", "am having"],
          chosen: 1,
          answer: 1,
          explanation: "Second conditional: if + past simple, then would + verb.",
          isCorrect: true,
        },
        {
          id: "demo-2",
          prompt: "I ___ in Chicago since 2019.",
          options: ["live", "am living", "have lived", "lived"],
          chosen: 3,
          answer: 2,
          explanation: '"Since 2019" connects the past to now, so we use the present perfect: have lived.',
          isCorrect: false,
        },
      ],
    },
  ],
};

export const sampleRecommendations: Recommendation[] = [
  {
    teacherId: "t-1",
    score: 90,
    codes: [
      { id: "specialist", specialty: "Business English" },
      { id: "times", buckets: ["evening"] },
    ],
    teacher: {
      id: "t-1",
      slug: "sarah-mitchell",
      firstName: "Sarah",
      lastName: "Mitchell",
      headline: "Business English coach",
      avatarUrl: null,
      priceCents: 3500,
      ratingAvgX100: 490,
      ratingCount: 128,
      yearsExperience: 8,
      offersTrial: true,
    },
  },
  {
    teacherId: "t-2",
    score: 80,
    codes: [
      { id: "experience", years: 10 },
      { id: "times", buckets: ["weekend"] },
    ],
    teacher: {
      id: "t-2",
      slug: "michael-brooks",
      firstName: "Michael",
      lastName: "Brooks",
      headline: "Negotiation & presentations",
      avatarUrl: null,
      priceCents: 4000,
      ratingAvgX100: 480,
      ratingCount: 96,
      yearsExperience: 10,
      offersTrial: false,
    },
  },
  {
    teacherId: "t-3",
    score: 75,
    codes: [{ id: "topRated", rating: 4.9 }],
    teacher: {
      id: "t-3",
      slug: "james-robinson",
      firstName: "James",
      lastName: "Robinson",
      headline: "Speaking fluency",
      avatarUrl: null,
      priceCents: 2500,
      ratingAvgX100: 490,
      ratingCount: 41,
      yearsExperience: 4,
      offersTrial: true,
    },
  },
];
