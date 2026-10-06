import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { GRAMMAR, LISTENING, READING } from "../src/domain/placement/bank";
import { createTestApp } from "./harness";

const keys = new Map([...GRAMMAR, ...READING.flatMap((r) => r.questions), ...LISTENING.flatMap((c) => c.questions)].map((q) => [q.id, q.answer]));

describe("placement test API", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  const as = () => h.as("clerk_lea");

  before(async () => {
    h = await createTestApp();
    await h.seedStudent("clerk_lea", { firstName: "Lea" });
    await h.seedStudent("clerk_sam", { firstName: "Sam" });
    await h
      .http()
      .put("/api/student/placement")
      .set(as())
      .send({ goal: "travel", selfLevel: "intermediate", preferredTeacherGender: "no_preference", preferredTimes: ["evening"] })
      .expect(200);
  });
  after(() => h.close());

  it("shows goals and 'not started' before the test", async () => {
    const s = await h.http().get("/api/student/placement").set(as()).expect(200);
    assert.equal(s.body.status, "not_started");
    assert.equal(s.body.goal, "travel");
    assert.equal(s.body.inProgress, null);
  });

  it("runs the whole test, resumes, ignores double submits and saves the level", async () => {
    const start = await h.http().post("/api/student/placement/test").set(as()).send({}).expect(201);
    const attemptId = start.body.attemptId;
    let stage = start.body.stage;
    assert.equal(stage.kind, "grammar");
    assert.ok(!JSON.stringify(stage).includes("explanation"));

    // Resuming returns the same attempt and stage.
    const again = await h.http().post("/api/student/placement/test").set(as()).send({}).expect(201);
    assert.equal(again.body.attemptId, attemptId);
    assert.equal(again.body.stage.stageIndex, 0);

    let result = null;
    let steps = 0;
    while (!result && steps++ < 40) {
      const body =
        stage.kind === "speaking"
          ? { attemptId, stageIndex: stage.stageIndex, canDo: ["A1", "A2", "B1"] }
          : { attemptId, stageIndex: stage.stageIndex, answers: Object.fromEntries(stage.questions.map((q: { id: string }) => [q.id, keys.get(q.id)])) };
      const r = await h.http().post("/api/student/placement/test/answer").set(as()).send(body).expect(201);
      if (steps === 1) {
        // Same stage sent twice → nothing is graded twice, the current stage comes back.
        const dup = await h.http().post("/api/student/placement/test/answer").set(as()).send(body).expect(201);
        assert.equal(dup.body.stage.stageIndex, 1);
      }
      if (r.body.done) result = r.body.result;
      else stage = r.body.stage;
    }
    assert.ok(result, "test finished");
    assert.equal(result.skills.grammar.level, "C2");
    assert.equal(result.skills.speaking.level, "B1");

    const s = await h.http().get("/api/student/placement").set(as()).expect(200);
    assert.equal(s.body.status, "completed");
    assert.equal(s.body.level, result.overall);
    assert.equal(s.body.scores.grammar, "C2");

    const rev = await h.http().get("/api/student/placement/review").set(as()).expect(200);
    assert.ok(rev.body.sections.length >= 3);
    assert.ok(rev.body.sections.every((sec: { questions: { isCorrect: boolean }[] }) => sec.questions.every((q) => q.isCorrect)));

    // Skipping later never replaces a measured level.
    const skip = await h.http().post("/api/student/placement/skip").set(as()).expect(201);
    assert.equal(skip.body.status, "completed");
  });

  it("validates answers", async () => {
    const start = await h.http().post("/api/student/placement/test").set(as()).send({ restart: true }).expect(201);
    await h.http().post("/api/student/placement/test/answer").set(as()).send({ attemptId: start.body.attemptId, stageIndex: 0, answers: {} }).expect(400);
    await h.http().post("/api/student/placement/test/answer").set(as()).send({ attemptId: start.body.attemptId, stageIndex: 0, skipSection: true }).expect(400);
  });

  it("skipping gives an estimated level and the test stays available", async () => {
    const sam = h.as("clerk_sam");
    await h
      .http()
      .put("/api/student/placement")
      .set(sam)
      .send({ goal: "business", selfLevel: "advanced", preferredTeacherGender: "no_preference", preferredTimes: [] })
      .expect(200);
    const r = await h.http().post("/api/student/placement/skip").set(sam).expect(201);
    assert.deepEqual(r.body, { status: "skipped", level: "C1" });
    await h.http().get("/api/student/placement/review").set(sam).expect(404);
    const start = await h.http().post("/api/student/placement/test").set(sam).send({}).expect(201);
    assert.equal(start.body.stage.kind, "grammar");
  });

  it("is for students only, and an attempt belongs to its student", async () => {
    await h.seedAdmin();
    await h.http().get("/api/student/placement").set(h.as("clerk_admin")).expect(403);
    const mine = await h.http().post("/api/student/placement/test").set(as()).send({}).expect(201);
    await h.http().post("/api/student/placement/test/answer").set(h.as("clerk_sam")).send({ attemptId: mine.body.attemptId, stageIndex: 0, answers: {} }).expect(404);
  });
});
