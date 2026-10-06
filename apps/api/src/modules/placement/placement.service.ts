import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { placementAttempts, studentProfiles } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, notFound } from "../../common/errors";
import { computeResult, estimateFromSelf, newAttempt, PlacementError, publicStage, review, submitStage, type AttemptState } from "../../domain/placement/engine";
import type { Cefr } from "../../domain/placement/types";

/**
 * Student placement test: start / resume, answer stage by stage, skip, and see the corrections.
 * Grading happens here — the browser never receives the answer keys before the test is over.
 */
@Injectable()
export class PlacementService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async profile(studentId: string) {
    const [p] = await this.db.select().from(studentProfiles).where(eq(studentProfiles.userId, studentId));
    if (p) return p;
    const [created] = await this.db.insert(studentProfiles).values({ userId: studentId }).onConflictDoNothing().returning();
    return created ?? (await this.db.select().from(studentProfiles).where(eq(studentProfiles.userId, studentId)))[0];
  }

  private async inProgress(studentId: string) {
    const [a] = await this.db
      .select()
      .from(placementAttempts)
      .where(and(eq(placementAttempts.studentId, studentId), eq(placementAttempts.status, "in_progress")))
      .orderBy(desc(placementAttempts.startedAt))
      .limit(1);
    return a ?? null;
  }

  private async lastCompleted(studentId: string) {
    const [a] = await this.db
      .select()
      .from(placementAttempts)
      .where(and(eq(placementAttempts.studentId, studentId), eq(placementAttempts.status, "completed")))
      .orderBy(desc(placementAttempts.completedAt))
      .limit(1);
    return a ?? null;
  }

  /** GET /student/placement — goals, level and test status (for the onboarding and dashboard screens). */
  async status(studentId: string) {
    const p = await this.profile(studentId);
    const [current, done] = await Promise.all([this.inProgress(studentId), this.lastCompleted(studentId)]);
    return {
      goal: p.goal,
      selfLevel: p.selfLevel,
      preferredTeacherGender: p.preferredTeacherGender,
      preferredTimes: p.preferredTimes,
      status: p.placementStatus,
      level: p.cefrLevel,
      scores: p.placementScores ?? {},
      completedAt: p.placementCompletedAt,
      inProgress: current
        ? {
            attemptId: current.id,
            sectionIndex: current.state.current ? ["grammar", "reading", "listening", "speaking"].indexOf(current.state.current.section) : 3,
            startedAt: current.startedAt,
          }
        : null,
      lastResult: done?.result ?? null,
    };
  }

  /** POST /student/placement/test — resumes the test in progress, or starts a new one. */
  async start(studentId: string, restart = false) {
    const current = await this.inProgress(studentId);
    if (current && !restart) return { attemptId: current.id, stage: publicStage(current.state) };
    if (current) await this.db.update(placementAttempts).set({ status: "abandoned" }).where(eq(placementAttempts.id, current.id));
    const p = await this.profile(studentId);
    const state = newAttempt(p.selfLevel);
    const [a] = await this.db.insert(placementAttempts).values({ studentId, state, startedAt: this.clock.now() }).returning();
    return { attemptId: a.id, stage: publicStage(state) };
  }

  /** POST /student/placement/test/answer — grades the current stage; returns the next one or the result. */
  async answer(studentId: string, input: { attemptId: string; stageIndex: number; answers?: Record<string, number>; canDo?: Cefr[]; skipSection?: boolean }) {
    const [a] = await this.db
      .select()
      .from(placementAttempts)
      .where(and(eq(placementAttempts.id, input.attemptId), eq(placementAttempts.studentId, studentId)));
    if (!a) throw notFound("Test");
    if (a.status !== "in_progress") throw badRequest("This test is no longer in progress.");
    // Double submit (e.g. two clicks or a retry after a timeout): send back where the test is now.
    if (input.stageIndex !== a.state.stages.length) return { attemptId: a.id, done: false, stage: publicStage(a.state) };

    let next: AttemptState;
    try {
      next = submitStage(a.state, input);
    } catch (e) {
      if (e instanceof PlacementError) throw badRequest(e.message);
      throw e;
    }

    if (next.current) {
      await this.db.update(placementAttempts).set({ state: next }).where(eq(placementAttempts.id, a.id));
      return { attemptId: a.id, done: false, stage: publicStage(next) };
    }

    const result = computeResult(next);
    const now = this.clock.now();
    const scores = Object.fromEntries(Object.entries(result.skills).flatMap(([k, v]) => (v.level ? [[k, v.level]] : [])));
    await this.db.transaction(async (tx) => {
      await tx.update(placementAttempts).set({ state: next, result, status: "completed", completedAt: now }).where(eq(placementAttempts.id, a.id));
      await tx
        .update(studentProfiles)
        .set({ cefrLevel: result.overall, placementScores: scores, placementStatus: "completed", placementCompletedAt: now })
        .where(eq(studentProfiles.userId, studentId));
    });
    return { attemptId: a.id, done: true, result };
  }

  /** POST /student/placement/skip — no test for now: the level is the student's own estimate. */
  async skip(studentId: string) {
    const p = await this.profile(studentId);
    const current = await this.inProgress(studentId);
    if (current) await this.db.update(placementAttempts).set({ status: "abandoned" }).where(eq(placementAttempts.id, current.id));
    // A measured level is never overwritten by an estimate.
    if (p.placementStatus === "completed") return { status: p.placementStatus, level: p.cefrLevel };
    const level = estimateFromSelf(p.selfLevel);
    await this.db.update(studentProfiles).set({ placementStatus: "skipped", cefrLevel: level, placementScores: {} }).where(eq(studentProfiles.userId, studentId));
    return { status: "skipped" as const, level };
  }

  /** GET /student/placement/review — result and corrections of the last finished test. */
  async review(studentId: string) {
    const a = await this.lastCompleted(studentId);
    if (!a) throw notFound("Finished test");
    return { attemptId: a.id, completedAt: a.completedAt, result: a.result, sections: review(a.state) };
  }
}
