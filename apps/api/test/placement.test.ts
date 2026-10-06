import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GRAMMAR, LISTENING, READING, SPEAKING_CAN_DO } from "../src/domain/placement/bank";
import { CEFR, type Cefr } from "../src/domain/placement/types";
import { computeResult, newAttempt, publicStage, review, speakingLevel, stageQuestions, submitStage, type AttemptState } from "../src/domain/placement/engine";

/** Answers the current stage: right answers up to and including `upTo`, wrong ones above it. */
function play(state: AttemptState, upTo: Cefr | null, opts: { skipListening?: boolean; canDo?: Cefr[] } = {}) {
  let s = state;
  const path: string[] = [];
  while (s.current) {
    const { section, level } = s.current;
    path.push(`${section}:${level ?? "-"}`);
    if (section === "speaking") s = submitStage(s, { canDo: opts.canDo ?? [] });
    else if (section === "listening" && opts.skipListening) s = submitStage(s, { skipSection: true });
    else {
      const good = upTo !== null && CEFR.indexOf(level!) <= CEFR.indexOf(upTo);
      const answers = Object.fromEntries(stageQuestions(s.plan, section, level!).map((q) => [q.id, good ? q.answer : (q.answer + 1) % 4]));
      s = submitStage(s, { answers });
    }
  }
  return { state: s, path };
}

describe("placement bank", () => {
  it("has enough well-formed content for every level", () => {
    for (const l of CEFR) {
      assert.ok(GRAMMAR.filter((g) => g.level === l).length >= 3, `grammar ${l}`);
      assert.ok(READING.filter((r) => r.level === l).length >= 1, `reading ${l}`);
      assert.ok(LISTENING.filter((c) => c.level === l).length >= 1, `listening ${l}`);
    }
    assert.deepEqual(
      SPEAKING_CAN_DO.map((c) => c.level),
      [...CEFR],
    );
    const all = [...GRAMMAR, ...READING.flatMap((r) => r.questions), ...LISTENING.flatMap((c) => c.questions)];
    assert.equal(new Set(all.map((q) => q.id)).size, all.length, "unique ids");
    for (const q of all) {
      assert.equal(q.options.length, 4, q.id);
      assert.equal(new Set(q.options).size, 4, `${q.id} duplicate option`);
      assert.ok(q.answer >= 0 && q.answer <= 3, q.id);
      assert.ok(q.explanation.length > 10, `${q.id} explanation`);
    }
    for (const g of GRAMMAR) assert.equal(g.prompt.split("___").length, 2, `${g.id} needs exactly one gap`);
  });
});

describe("placement engine", () => {
  it("never sends answer keys to the browser", () => {
    const s = newAttempt("intermediate");
    const json = JSON.stringify(publicStage(s));
    assert.ok(!json.includes('"answer"') && !json.includes("explanation"));
  });

  it("starts from the student's own estimate", () => {
    assert.equal(newAttempt("beginner").current?.level, "A1");
    assert.equal(newAttempt("intermediate").current?.level, "A2");
    assert.equal(newAttempt("advanced").current?.level, "B1");
  });

  it("a perfect student climbs to C2 in every section", () => {
    const { state, path } = play(newAttempt("advanced"), "C2", { canDo: [...CEFR] });
    assert.deepEqual(path.slice(0, 4), ["grammar:B1", "grammar:B2", "grammar:C1", "grammar:C2"]);
    assert.equal(path[4], "reading:C1"); // one level below the grammar result
    const r = computeResult(state);
    assert.equal(r.overall, "C2");
    assert.deepEqual([r.skills.grammar.level, r.skills.reading.level, r.skills.listening.level, r.skills.speaking.level], ["C2", "C2", "C2", "C2"]);
    assert.equal(r.skills.grammar.correct, 12);
  });

  it("a B1 student stops after the first failed level", () => {
    const { state, path } = play(newAttempt("beginner"), "B1", { canDo: ["A1", "A2", "B1"] });
    assert.deepEqual(path.slice(0, 4), ["grammar:A1", "grammar:A2", "grammar:B1", "grammar:B2"]);
    assert.deepEqual(path.slice(4, 7), ["reading:A2", "reading:B1", "reading:B2"]);
    const r = computeResult(state);
    assert.equal(r.overall, "B1");
    assert.equal(r.skills.reading.level, "B1");
  });

  it("an overconfident student goes down until a level is passed", () => {
    const { state, path } = play(newAttempt("advanced"), "A2", { canDo: ["A1", "A2"] });
    assert.deepEqual(path.slice(0, 3), ["grammar:B1", "grammar:A2", "reading:A1"]);
    assert.equal(computeResult(state).skills.grammar.level, "A2");
  });

  it("a true beginner gets A1 and a short test", () => {
    const { state, path } = play(newAttempt("beginner"), null);
    assert.ok(path.length <= 4, path.join(" "));
    assert.equal(computeResult(state).overall, "A1");
  });

  it("listening can be skipped and is left out of the overall level", () => {
    const { state } = play(newAttempt("intermediate"), "B2", { skipListening: true, canDo: ["A1", "A2", "B1", "B2"] });
    const r = computeResult(state);
    assert.equal(r.skills.listening.skipped, true);
    assert.equal(r.skills.listening.level, null);
    assert.equal(r.overall, "B2");
  });

  it("caps self-assessed speaking one level above the measured skills", () => {
    const { state } = play(newAttempt("beginner"), "A2", { canDo: [...CEFR] });
    assert.equal(computeResult(state).skills.speaking.level, "B1");
    assert.equal(speakingLevel(["A1", "B1", "B2"]), "A1"); // gaps break the chain
  });

  it("rejects incomplete answers and lists corrections afterwards", () => {
    const s = newAttempt("beginner");
    assert.throws(() => submitStage(s, { answers: {} }), /every question/);
    const { state } = play(s, "A2");
    const sections = review(state);
    const first = sections[0];
    assert.equal(first.section, "grammar");
    assert.ok(first.questions.every((q) => typeof q.explanation === "string" && q.chosen !== null));
    assert.ok(sections.some((x) => x.section === "listening" && x.transcript));
  });
});
