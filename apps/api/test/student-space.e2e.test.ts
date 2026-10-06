/**
 * Student space API: overview, lessons (with cancellation preview), lesson detail, homework,
 * progress, payments, profile and account deletion.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createTestApp } from "./harness";

type H = Awaited<ReturnType<typeof createTestApp>>;
let h: H;
const ids = { student: "", other: "", teacher: "", teacher2: "", future: "", soon: "", pack: "", done: "", recent: "", packageId: "", hwOpen: "", hwDone: "" };

before(async () => {
  h = await createTestApp({ now: "2026-10-01T00:00:00Z" });
  const s = await h.seedStudent("clerk_ss_student", { firstName: "Maria", lastName: "Silva" });
  const o = await h.seedStudent("clerk_ss_other", { email: "other-ss@example.com" });
  const t = await h.seedTeacher("clerk_ss_teacher", { firstName: "Sarah" });
  const t2 = await h.seedTeacher("clerk_ss_teacher2", { firstName: "James" });
  Object.assign(ids, { student: s.id, other: o.id, teacher: t.id, teacher2: t2.id });
  await h.db.update(h.schema.studentProfiles).set({ cefrLevel: "B1", placementScores: { grammar: "B1", reading: "B2", listening: "B1", speaking: "A2" } }).where(eq(h.schema.studentProfiles.userId, s.id));

  // Upcoming: > 24 h away (full refund), < 24 h away (no refund), from a package (lesson back).
  ids.future = (await h.seedBooking(s.id, t.id)).id; // 2026-10-14 16:00
  ids.soon = (await h.seedBooking(s.id, t2.id, { startsAt: new Date("2026-10-01T10:00:00Z") })).id;
  const [pkg] = await h.db
    .insert(h.schema.lessonPackages)
    .values({ studentId: s.id, teacherId: t.id, lessonCount: 5, lessonsUsed: 2, unitPriceCents: 3500, discountPct: 5, totalCents: 16625, status: "active" })
    .returning();
  ids.packageId = pkg.id;
  await h.db.insert(h.schema.payments).values({ studentId: s.id, packageId: pkg.id, amountCents: 16625, status: "succeeded", providerRef: "pi_pkg_ss" });
  const [pb] = await h.db
    .insert(h.schema.bookings)
    .values({ studentId: s.id, teacherId: t.id, packageId: pkg.id, type: "package", startsAt: new Date("2026-10-21T16:00:00Z"), durationMin: 50, priceCents: 3325, status: "confirmed" })
    .returning();
  ids.pack = pb.id;

  // Past: a completed lesson with report, homework and review (September), and one that ended 2 h ago.
  const done = await h.seedBooking(s.id, t.id, { startsAt: new Date("2026-09-16T16:00:00Z"), status: "completed", topic: "Meetings" });
  ids.done = done.id;
  const [lesson] = await h.db.insert(h.schema.lessons).values({ bookingId: done.id, endedAt: new Date("2026-09-16T16:50:00Z"), attendance: "attended" }).returning();
  await h.db.insert(h.schema.lessonReports).values({
    lessonId: lesson.id,
    topicsCovered: "Leading a meeting",
    strengths: "Clear structure",
    developmentAreas: "Past tense",
    recommendation: "Negotiation next",
    privateFluency: 4,
    sentAt: new Date("2026-09-16T17:00:00Z"),
  });
  const [hw1] = await h.db.insert(h.schema.homework).values({ lessonId: lesson.id, studentId: s.id, teacherId: t.id, description: "Write an agenda", dueDate: "2026-10-03" }).returning();
  const [hw2] = await h.db.insert(h.schema.homework).values({ lessonId: lesson.id, studentId: s.id, teacherId: t.id, description: "Phrasal verbs", status: "completed" }).returning();
  Object.assign(ids, { hwOpen: hw1.id, hwDone: hw2.id });
  await h.db.insert(h.schema.reviews).values({ bookingId: done.id, studentId: s.id, teacherId: t.id, rating: 5, comment: "Great" });

  const recent = await h.seedBooking(s.id, t2.id, { startsAt: new Date("2026-09-30T21:00:00Z"), status: "completed" });
  ids.recent = recent.id;
  await h.db.insert(h.schema.lessons).values({ bookingId: recent.id, endedAt: new Date("2026-09-30T21:50:00Z"), attendance: "attended" });
});
after(() => h?.close());

const S = () => h.as("clerk_ss_student");

describe("student space — overview", () => {
  it("summarises stats, packages, next lesson, homework and payments", async () => {
    const res = await h.http().get("/api/student/overview").set(S()).expect(200);
    const o = res.body;
    assert.equal(o.firstName, "Maria");
    assert.equal(o.timezone, "Europe/Zurich");
    assert.deepEqual(o.level, { current: "B1", target: "B2", selfLevel: null, placement: "not_started" });
    assert.equal(o.lessonsCompleted, 2);
    assert.equal(o.hoursStudied, 1.7); // 100 min
    assert.equal(o.teachersCount, 2);
    assert.equal(o.activePackages.length, 1);
    assert.deepEqual({ ...o.activePackages[0], teacher: o.activePackages[0].teacher.firstName }, { id: ids.packageId, teacher: "Sarah", lessonCount: 5, lessonsUsed: 2, remaining: 3 });
    assert.equal(o.nextLesson.id, ids.soon);
    assert.equal(o.nextLesson.teacher.firstName, "James");
    assert.equal(o.nextLesson.teacher.slug, "clerk-ss-teacher2");
    assert.deepEqual(o.upcoming.map((b: { id: string }) => b.id), [ids.soon, ids.future, ids.pack]);
    assert.equal(o.homework.length, 1);
    assert.equal(o.homework[0].description, "Write an agenda");
    assert.deepEqual(o.homeworkCounts, { open: 1, done: 1 });
    assert.equal(o.lastReport.topicsCovered, "Leading a meeting");
    assert.equal(o.lastReport.privateFluency, undefined);
    assert.equal(o.recentPayments.length, 3);
  });

  it("is for students only", async () => {
    await h.http().get("/api/student/overview").set(h.as("clerk_ss_teacher")).expect(403);
  });
});

describe("student space — lessons", () => {
  it("lists upcoming lessons with the refund outcome of cancelling now", async () => {
    const res = await h.http().get("/api/student/lessons?scope=upcoming").set(S()).expect(200);
    const byId = Object.fromEntries(res.body.map((b: { id: string }) => [b.id, b]));
    assert.equal(res.body.length, 3);
    assert.equal(byId[ids.future].canCancel, true);
    assert.deepEqual(
      { refundCents: byId[ids.future].cancellation.refundCents, mode: byId[ids.future].cancellation.refundMode, full: byId[ids.future].cancellation.fullRefund },
      { refundCents: 3500, mode: "money", full: true },
    );
    assert.deepEqual(
      { refundCents: byId[ids.soon].cancellation.refundCents, mode: byId[ids.soon].cancellation.refundMode, full: byId[ids.soon].cancellation.fullRefund },
      { refundCents: 0, mode: "none", full: false },
    );
    assert.equal(byId[ids.pack].cancellation.refundMode, "package_credit");
    assert.equal(byId[ids.future].teacher.firstName, "Sarah");
    assert.ok(byId[ids.future].opensAt);
  });

  it("lists past lessons newest first with report and review flags", async () => {
    const res = await h.http().get("/api/student/lessons?scope=past").set(S()).expect(200);
    assert.deepEqual(res.body.map((b: { id: string }) => b.id), [ids.recent, ids.done]);
    const [recent, done] = res.body;
    assert.equal(done.hasReport, true);
    assert.deepEqual(done.myReview, { rating: 5 });
    assert.equal(done.canReview, false);
    assert.equal(recent.hasReport, false);
    assert.equal(recent.canReview, true);
    assert.equal(recent.canCancel, false);
  });

  it("returns one lesson with report, review, homework and the dispute window", async () => {
    const res = await h.http().get(`/api/student/lessons/${ids.done}`).set(S()).expect(200);
    assert.equal(res.body.report.topicsCovered, "Leading a meeting");
    assert.equal(res.body.report.privateFluency, undefined);
    assert.equal(res.body.review.rating, 5);
    assert.equal(res.body.homework.length, 2);
    assert.equal(res.body.dispute, null);
    assert.equal(res.body.canDispute, false); // ended two weeks ago

    const recent = await h.http().get(`/api/student/lessons/${ids.recent}`).set(S()).expect(200);
    assert.equal(recent.body.canDispute, true);
    assert.equal(recent.body.report, null);
  });

  it("hides other students' lessons", async () => {
    await h.http().get(`/api/student/lessons/${ids.done}`).set(h.as("clerk_ss_other")).expect(403);
    await h.http().get("/api/student/lessons/8b0c9c3e-0000-4000-8000-000000000000").set(S()).expect(404);
  });

  it("the real cancellation matches the preview (package lesson goes back)", async () => {
    const res = await h.http().post(`/api/bookings/${ids.pack}/cancel`).set(S()).send({ reason: "Travel" }).expect(201);
    assert.equal(res.body.refundMode, "package_credit");
    const [pkg] = await h.db.select().from(h.schema.lessonPackages).where(eq(h.schema.lessonPackages.id, ids.packageId));
    assert.equal(pkg.lessonsUsed, 1);
    const past = await h.http().get("/api/student/lessons?scope=past").set(S()).expect(200);
    assert.ok(past.body.some((b: { id: string; status: string }) => b.id === ids.pack && b.status === "cancelled"));
  });
});

describe("student space — homework", () => {
  it("lists homework with teacher and lesson date, open first", async () => {
    const res = await h.http().get("/api/student/homework").set(S()).expect(200);
    assert.deepEqual(res.body.map((x: { id: string }) => x.id), [ids.hwOpen, ids.hwDone]);
    assert.equal(res.body[0].teacher.firstName, "Sarah");
    assert.equal(res.body[0].bookingId, ids.done);
    assert.equal(new Date(res.body[0].lessonDate).toISOString(), "2026-09-16T16:00:00.000Z");
  });

  it("marks homework done and reopens it (own homework only)", async () => {
    const done = await h.http().post(`/api/student/homework/${ids.hwOpen}/complete`).set(S()).expect(201);
    assert.equal(done.body.status, "completed");
    await h.http().post(`/api/student/homework/${ids.hwOpen}/reopen`).set(h.as("clerk_ss_other")).expect(403);
    const again = await h.http().post(`/api/student/homework/${ids.hwOpen}/reopen`).set(S()).expect(201);
    assert.equal(again.body.status, "assigned");
  });
});

describe("student space — progress & payments", () => {
  it("returns level history, lessons per month and report summaries", async () => {
    const res = await h.http().get("/api/student/progress").set(S()).expect(200);
    const p = res.body;
    assert.equal(p.level.current, "B1");
    assert.equal(p.levelHistory[0].source, "placement_test");
    assert.equal(p.levelHistory[0].scores.reading, "B2");
    assert.equal(p.lessonsPerMonth.length, 6);
    assert.deepEqual(p.lessonsPerMonth.at(-1), { month: "2026-10", lessons: 0, minutes: 0 });
    assert.deepEqual(p.lessonsPerMonth.at(-2), { month: "2026-09", lessons: 2, minutes: 100 });
    assert.equal(p.totalHours, 1.7);
    assert.equal(p.reports.length, 1);
    assert.equal(p.reports[0].recommendation, "Negotiation next");
  });

  it("lists payments with what was bought and packages with remaining lessons", async () => {
    const res = await h.http().get("/api/student/payments").set(S()).expect(200);
    const { payments, packages, totals } = res.body;
    assert.equal(payments.length, 5);
    const pkgPay = payments.find((p: { packageId: string | null }) => p.packageId === ids.packageId);
    assert.deepEqual(pkgPay.what, { kind: "package", lessonCount: 5 });
    assert.equal(pkgPay.teacher.firstName, "Sarah");
    const single = payments.find((p: { bookingId: string | null }) => p.bookingId === ids.done);
    assert.equal(single.what.kind, "single");
    assert.equal(packages.length, 1);
    assert.equal(packages[0].remaining, 4);
    assert.equal(totals.spentCents, 16625 + 4 * 3500);
  });
});

describe("student account — profile & deletion", () => {
  it("reads and updates the profile, validating the time zone", async () => {
    const got = await h.http().get("/api/me/profile").set(S()).expect(200);
    assert.equal(got.body.email, "clerk_ss_student@example.com");
    const put = await h
      .http()
      .put("/api/me/profile")
      .set(S())
      .send({ firstName: "Mariana", phone: "+41 79 000 00 00", country: "Switzerland", nativeLanguage: "Portuguese", timezone: "America/Sao_Paulo" })
      .expect(200);
    assert.equal(put.body.firstName, "Mariana");
    assert.equal(put.body.timezone, "America/Sao_Paulo");
    const cleared = await h.http().put("/api/me/profile").set(S()).send({ phone: "" }).expect(200);
    assert.equal(cleared.body.phone, null);
    await h.http().put("/api/me/profile").set(S()).send({ timezone: "Mars/Olympus" }).expect(400);
    await h.http().put("/api/me/profile").set(S()).send({ email: "x@y.z" }).expect(400);
    await h.http().put("/api/me/profile").set(S()).send({ firstName: "" }).expect(400);
    await h.http().get("/api/me/profile").set(h.as("clerk_ss_teacher")).expect(403);
  });

  it("refuses to delete the account while a confirmed lesson is ahead", async () => {
    await h.http().delete("/api/me").set(S()).expect(409);
  });

  it("anonymises the account and keeps bookings and payments", async () => {
    await h.http().post(`/api/bookings/${ids.future}/cancel`).set(S()).send({}).expect(201);
    await h.http().post(`/api/bookings/${ids.soon}/cancel`).set(S()).send({}).expect(201);
    await h.http().delete("/api/me").set(S()).expect(200);
    const [u] = await h.db.select().from(h.schema.users).where(eq(h.schema.users.id, ids.student));
    assert.equal(u.status, "deleted");
    assert.equal(u.email, `deleted-${ids.student}@amerivo.invalid`);
    assert.equal(`${u.firstName} ${u.lastName}`, "Deleted user");
    assert.equal(u.phone, null);
    assert.equal(u.country, null);
    const kept = await h.db.select().from(h.schema.bookings).where(eq(h.schema.bookings.studentId, ids.student));
    assert.equal(kept.length, 5);
    const pays = await h.db.select().from(h.schema.payments).where(eq(h.schema.payments.studentId, ids.student));
    assert.equal(pays.length, 5);
    // The old session no longer maps to an account.
    await h.http().get("/api/student/overview").set(S()).expect(401);
  });
});
