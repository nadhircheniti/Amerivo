/**
 * Adaptive placement test (pure logic, no I/O).
 *
 * Four sections: grammar & vocabulary, reading, listening (multiple choice, graded here) and speaking
 * (a self-assessment with "I can…" statements). Each choice section is played in stages of one CEFR
 * level (3 questions). Pass a stage with at least 2 correct answers out of 3:
 *   - passed → the next level up (stop after C2);
 *   - failed → stop, unless nothing was passed yet in this section: then one level down.
 * Levels below the starting level count as passed. Grammar starts from the student's own estimate;
 * reading and listening start one level below the grammar result. Skill level = highest level passed
 * (A1 when none). Overall level = rounded average of the skills taken; the self-assessed speaking
 * level is capped at one level above the best measured skill.
 */
import { GRAMMAR, LISTENING, READING, SPEAKING_CAN_DO } from "./bank";
import { CEFR, type Cefr, type ChoiceQuestion } from "./types";

export const SECTIONS = ["grammar", "reading", "listening", "speaking"] as const;
export type Section = (typeof SECTIONS)[number];
export type SelfLevel = "beginner" | "intermediate" | "advanced";

const GRAMMAR_PER_STAGE = 3;
const PASS_MARK = 2; // out of 3

export interface Plan {
  grammar: Record<Cefr, string[]>;
  reading: Record<Cefr, string>;
  listening: Record<Cefr, string>;
}

export interface StageRecord {
  section: Section;
  /** null for the speaking self-assessment */
  level: Cefr | null;
  itemIds: string[];
  answers: Record<string, number>;
  correct: number;
  total: number;
  passed: boolean;
  /** Listening skipped because the device can't play audio. */
  skipped?: boolean;
  /** Speaking: levels the student ticked. */
  canDo?: Cefr[];
}

export interface AttemptState {
  plan: Plan;
  stages: StageRecord[];
  current: { section: Section; level: Cefr | null } | null;
}

export interface SkillResult {
  level: Cefr | null;
  correct: number;
  total: number;
  skipped?: boolean;
  selfAssessed?: boolean;
}
export interface PlacementResult {
  overall: Cefr;
  skills: Record<Section, SkillResult>;
}

const idx = (l: Cefr) => CEFR.indexOf(l);
const above = (l: Cefr): Cefr | null => CEFR[idx(l) + 1] ?? null;
const below = (l: Cefr): Cefr | null => (idx(l) > 0 ? CEFR[idx(l) - 1] : null);

const grammarById = new Map(GRAMMAR.map((g) => [g.id, g]));
const readingById = new Map(READING.map((r) => [r.id, r]));
const listeningById = new Map(LISTENING.map((c) => [c.id, c]));

/** Fisher–Yates with an injectable random source (tests pass a seeded one). */
function shuffle<T>(arr: T[], rand: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draws this attempt's questions: 3 grammar items, 1 passage and 1 clip per level. */
export function drawPlan(rand: () => number = Math.random): Plan {
  const pick = <T extends { id: string; level: Cefr }>(list: T[], level: Cefr, n: number) =>
    shuffle(
      list.filter((x) => x.level === level),
      rand,
    )
      .slice(0, n)
      .map((x) => x.id);
  const plan = { grammar: {}, reading: {}, listening: {} } as Plan;
  for (const l of CEFR) {
    plan.grammar[l] = pick(GRAMMAR, l, GRAMMAR_PER_STAGE);
    plan.reading[l] = pick(READING, l, 1)[0];
    plan.listening[l] = pick(LISTENING, l, 1)[0];
  }
  return plan;
}

export const grammarStart = (self: SelfLevel | null | undefined): Cefr => (self === "advanced" ? "B1" : self === "intermediate" ? "A2" : "A1");
/** Level shown when the student skips the test (their own estimate). */
export const estimateFromSelf = (self: SelfLevel | null | undefined): Cefr => (self === "advanced" ? "C1" : self === "intermediate" ? "B1" : "A1");

export function newAttempt(self: SelfLevel | null | undefined, rand?: () => number): AttemptState {
  return { plan: drawPlan(rand), stages: [], current: { section: "grammar", level: grammarStart(self) } };
}

/** The questions (with keys) of a stage. */
export function stageQuestions(plan: Plan, section: Section, level: Cefr): ChoiceQuestion[] {
  if (section === "grammar") return plan.grammar[level].map((id) => grammarById.get(id)!);
  if (section === "reading") return [...readingById.get(plan.reading[level])!.questions];
  if (section === "listening") return [...listeningById.get(plan.listening[level])!.questions];
  return [];
}

/** What the browser receives for the current stage: no keys, no explanations. */
export function publicStage(state: AttemptState) {
  if (!state.current) return null;
  const { section, level } = state.current;
  const strip = (q: ChoiceQuestion) => ({ id: q.id, prompt: q.prompt, options: q.options });
  const base = { section, stageIndex: state.stages.length, sectionIndex: SECTIONS.indexOf(section), answered: answeredCount(state) };
  if (section === "speaking") return { ...base, kind: "speaking" as const, statements: SPEAKING_CAN_DO.map((c) => ({ level: c.level, statement: c.statement })) };
  const questions = stageQuestions(state.plan, section, level!).map(strip);
  if (section === "reading") {
    const p = readingById.get(state.plan.reading[level!])!;
    return { ...base, kind: "reading" as const, passage: { title: p.title, text: p.text }, questions };
  }
  if (section === "listening") {
    const c = listeningById.get(state.plan.listening[level!])!;
    // Slower speech for lower levels.
    const rate = idx(level!) <= 1 ? 0.85 : idx(level!) <= 3 ? 0.95 : 1;
    return { ...base, kind: "listening" as const, clip: { context: c.context, script: c.script, rate }, questions };
  }
  return { ...base, kind: "grammar" as const, questions };
}

const answeredCount = (s: AttemptState) => s.stages.reduce((n, r) => n + r.total, 0);

/** Next level to test in a section, or null when the section is finished. */
function nextLevelInSection(records: StageRecord[]): Cefr | null {
  const last = records[records.length - 1];
  if (!last?.level) return null;
  const tested = new Set(records.map((r) => r.level));
  if (last.passed) {
    const up = above(last.level);
    return up && !tested.has(up) ? up : null;
  }
  const anyPassed = records.some((r) => r.passed);
  const down = below(last.level);
  return !anyPassed && down && !tested.has(down) ? down : null;
}

export function sectionLevel(records: StageRecord[]): Cefr {
  const passed = records.filter((r) => r.passed && r.level).map((r) => idx(r.level!));
  return passed.length ? CEFR[Math.max(...passed)] : "A1";
}

/** Speaking self-assessment: highest level ticked without a gap from A1. */
export function speakingLevel(canDo: Cefr[]): Cefr {
  let level: Cefr = "A1";
  for (const l of CEFR) {
    if (!canDo.includes(l)) break;
    level = l;
  }
  return level;
}

export class PlacementError extends Error {}

/**
 * Grades the current stage and moves on. `answers` maps question id → option index.
 * Listening can be skipped (`skipSection`) when the device has no speech audio.
 */
export function submitStage(state: AttemptState, input: { answers?: Record<string, number>; canDo?: Cefr[]; skipSection?: boolean }): AttemptState {
  if (!state.current) throw new PlacementError("This test is already finished.");
  const { section, level } = state.current;
  const stages = [...state.stages];

  if (section === "speaking") {
    const canDo = (input.canDo ?? []).filter((l): l is Cefr => (CEFR as readonly string[]).includes(l));
    stages.push({ section, level: null, itemIds: [], answers: {}, correct: 0, total: 0, passed: true, canDo });
    return { ...state, stages, current: null };
  }

  if (input.skipSection) {
    if (section !== "listening") throw new PlacementError("Only the listening section can be skipped.");
    stages.push({ section, level, itemIds: [], answers: {}, correct: 0, total: 0, passed: false, skipped: true });
    return { ...state, stages, current: { section: "speaking", level: null } };
  }

  const questions = stageQuestions(state.plan, section, level!);
  const answers = input.answers ?? {};
  for (const q of questions) {
    const a = answers[q.id];
    if (!Number.isInteger(a) || a < 0 || a > 3) throw new PlacementError("Please answer every question.");
  }
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  const record: StageRecord = {
    section,
    level,
    itemIds: questions.map((q) => q.id),
    answers: Object.fromEntries(questions.map((q) => [q.id, answers[q.id]])),
    correct,
    total: questions.length,
    passed: correct >= PASS_MARK,
  };
  stages.push(record);

  const next = nextLevelInSection(stages.filter((r) => r.section === section));
  if (next) return { ...state, stages, current: { section, level: next } };

  // Section finished → next section.
  if (section === "grammar" || section === "reading") {
    const grammar = sectionLevel(stages.filter((r) => r.section === "grammar"));
    return { ...state, stages, current: { section: section === "grammar" ? "reading" : "listening", level: below(grammar) ?? "A1" } };
  }
  return { ...state, stages, current: { section: "speaking", level: null } };
}

/** Final levels once every section is done. */
export function computeResult(state: AttemptState): PlacementResult {
  const of = (s: Section) => state.stages.filter((r) => r.section === s);
  const measured = (s: Section): SkillResult => {
    const rs = of(s);
    if (rs.some((r) => r.skipped)) return { level: null, correct: 0, total: 0, skipped: true };
    return { level: sectionLevel(rs), correct: rs.reduce((n, r) => n + r.correct, 0), total: rs.reduce((n, r) => n + r.total, 0) };
  };
  const grammar = measured("grammar");
  const reading = measured("reading");
  const listening = measured("listening");
  const best = Math.max(...[grammar, reading, listening].filter((x) => x.level).map((x) => idx(x.level!)));
  const self = speakingLevel(of("speaking")[0]?.canDo ?? []);
  const speaking: SkillResult = { level: CEFR[Math.min(idx(self), best + 1)], correct: 0, total: 0, selfAssessed: true };
  const levels = [grammar, reading, listening, speaking].filter((x) => x.level).map((x) => idx(x.level!));
  const overall = CEFR[Math.round(levels.reduce((a, b) => a + b, 0) / levels.length)];
  return { overall, skills: { grammar, reading, listening, speaking } };
}

/** Corrections shown after the test: every question answered, with the right answer and why. */
export function review(state: AttemptState) {
  return state.stages
    .filter((r) => r.section !== "speaking" && !r.skipped)
    .map((r) => {
      const qs = stageQuestions(state.plan, r.section, r.level!);
      const passage = r.section === "reading" ? readingById.get(state.plan.reading[r.level!])! : null;
      const clip = r.section === "listening" ? listeningById.get(state.plan.listening[r.level!])! : null;
      return {
        section: r.section,
        level: r.level,
        correct: r.correct,
        total: r.total,
        passage: passage ? { title: passage.title, text: passage.text } : null,
        transcript: clip ? { context: clip.context, script: clip.script } : null,
        questions: qs.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
          chosen: r.answers[q.id] ?? null,
          answer: q.answer,
          explanation: q.explanation,
          isCorrect: r.answers[q.id] === q.answer,
        })),
      };
    });
}
