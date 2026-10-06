/** Placement test content types. The bank lives in bank.ts; answers never leave the API. */
export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Cefr = (typeof CEFR)[number];

/** One multiple-choice question (always 4 options, `answer` = index of the correct one). */
export interface ChoiceQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  /** Short, simple-English correction shown after the test. */
  explanation: string;
}

/** Grammar & vocabulary item, tagged with its CEFR level. */
export interface GrammarItem extends ChoiceQuestion {
  level: Cefr;
}

/** Reading passage with exactly 3 questions. */
export interface ReadingPassage {
  id: string;
  level: Cefr;
  title: string;
  text: string;
  questions: [ChoiceQuestion, ChoiceQuestion, ChoiceQuestion];
}

/** Listening clip (read aloud in American English by the browser) with exactly 3 questions. */
export interface ListeningClip {
  id: string;
  level: Cefr;
  /** Short context shown before playing, e.g. "A voicemail from a dentist's office". */
  context: string;
  /** What is spoken. Lines may start with a speaker label "A:" / "B:" for dialogues. */
  script: string;
  questions: [ChoiceQuestion, ChoiceQuestion, ChoiceQuestion];
}

/** "I can…" statement used for the speaking self-assessment. */
export interface CanDo {
  level: Cefr;
  statement: string;
}
