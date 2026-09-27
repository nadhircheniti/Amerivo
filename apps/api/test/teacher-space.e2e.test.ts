/** Teacher space: dashboard overview, students, lesson report context, earnings details, Stripe Connect. */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createTestApp } from "./harness";

type Acct = { details_submitted: boolean; payouts_enabled: boolean; capabilities?: { transfers?: string }; requirements?: { currently_due: string[] }; external_accounts?: { data: unknown[] } };

describe("teacher space", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  let account: Acct = { details_submitted: false, payouts_enabled: false, requirements: { currently_due: ["external_account"] } };
  const onboarding: { accountId?: string | null; returnUrl: string }[] = [];
  let teacher: { id: string };
  let alice: { id: string };
  let bob: { id: string };
  const ids: Record<string, string> = {};

  before(async () => {
    process.env.WEB_URL = "https://amerivo.test,https://amerivo-*.vercel.app";
    h = await createTestApp({
      now: "2026-10-07T17:00:00Z",
      stripe: {
        retrieveAccount: async () => account,
        onboardingLink: async (p: { accountId?: string | null; returnUrl: string }) => {
          onboarding.push(p);
          return { accountId: p.accountId ?? "acct_new_1", url: "https://connect.stripe.test/onboarding" };
        },
        dashboardLink: async () => ({ url: "https://connect.stripe.test/dashboard" }),
      },
    });
    teacher = await h.seedTeacher("clerk_ts_t");
    await h.seedTeacher("clerk_ts_other");
    alice = await h.seedStudent("clerk_ts_alice", { firstName: "Alice", lastName: "Martin", country: "France" });
    bob = await h.seedStudent("clerk_ts_bob", { firstName: "Bob", lastName: "Lee" });
    await h.seedStudent("clerk_ts_stranger");
    await h.db.update(h.schema.studentProfiles).set({ cefrLevel: "B1" }).where(eq(h.schema.studentProfiles.userId, alice.id));

    // Two lessons last week, completed through the API ("End lesson").
    const past = await h.seedBooking(alice.id, teacher.id, { startsAt: new Date("2026-10-07T16:00:00Z") });
    const trial = await h.seedBooking(bob.id, teacher.id, { startsAt: new Date("2026-10-06T16:00:00Z"), type: "trial", durationMin: 20, priceCents: 0 });
    ids.past = past.id;
    ids.trial = trial.id;
    const T = h.as("clerk_ts_t");
    await h.http().post(`/api/bookings/${past.id}/complete`).set(T).send({}).expect(201);
    await h.http().post(`/api/bookings/${trial.id}/complete`).set(T).send({}).expect(201);
    await h.http().put(`/api/bookings/${trial.id}/report`).set(T).send({ topicsCovered: "Introductions", recommendation: "Work on past tense" }).expect(200);

    // Today (Wednesday Oct 14, 10:00 in Chicago): one lesson at 11:00 local, one next week, one cancelled.
    h.clock.set("2026-10-14T15:00:00Z");
    ids.today = (await h.seedBooking(alice.id, teacher.id, { startsAt: new Date("2026-10-14T16:00:00Z"), topic: "Negotiation" })).id;
    ids.next = (await h.seedBooking(bob.id, teacher.id, { startsAt: new Date("2026-10-21T16:00:00Z") })).id;
    await h.seedBooking(bob.id, teacher.id, {
      startsAt: new Date("2026-10-28T16:00:00Z"),
      status: "cancelled",
      cancelledBy: "teacher",
      cancelledAt: new Date("2026-10-13T10:00:00Z"),
    });
    await h.db.insert(h.schema.notifications).values({ userId: teacher.id, type: "new_booking", title: "New booking", channels: ["in_app"] });
    await h.db.insert(h.schema.lessonPackages).values({ studentId: bob.id, teacherId: teacher.id, lessonCount: 5, lessonsUsed: 1, unitPriceCents: 3325, totalCents: 16625, status: "active" });
  });
  after(() => h?.close());

  it("is for teachers only", async () => {
    await h.http().get("/api/teacher/overview").set(h.as("clerk_ts_alice")).expect(403);
    await h.http().get("/api/teacher/students").expect(401);
  });

  it("overview: today in the teacher's time zone, key figures, reports to write", async () => {
    const { body } = await h.http().get("/api/teacher/overview").set(h.as("clerk_ts_t")).expect(200);
    assert.equal(body.timezone, "America/Chicago");
    assert.equal(body.today.length, 1);
    const l = body.today[0];
    assert.equal(l.bookingId, ids.today);
    assert.equal(l.topic, "Negotiation");
    assert.deepEqual({ id: l.student.id, firstName: l.student.firstName, lastName: l.student.lastName, level: l.student.level }, { id: alice.id, firstName: "Alice", lastName: "Martin", level: "B1" });
    assert.equal(l.history.lessons, 1);
    assert.equal(body.upcomingCount, 2);
    assert.equal(new Date(body.nextLessonAt).toISOString(), "2026-10-14T16:00:00.000Z");
    assert.equal(body.earnings.monthPendingCents, 2800); // $35 − 20 %
    assert.equal(new Date(body.earnings.nextPayoutDate).toISOString().slice(0, 10), "2026-10-28");
    assert.equal(body.students.active, 2);
    assert.equal(body.students.total, 2);
    assert.equal(body.students.recent.length, 2);
    assert.equal(body.cancellations.byTeacher, 1);
    assert.equal(body.cancellations.thisMonth, 1);
    // The trial has a report; Alice's lesson doesn't.
    assert.deepEqual(
      body.reportsToWrite.map((r: { bookingId: string }) => r.bookingId),
      [ids.past],
    );
    assert.equal(body.reportsToWrite[0].student.firstName, "Alice");
    assert.ok(Array.isArray(body.notifications) && body.notifications.length > 0 && body.notifications.length <= 5);
    assert.deepEqual(body.rating, { avgX100: 0, count: 0 });
  });

  it("students: list with totals and packs, detail with history and reports", async () => {
    const { body } = await h.http().get("/api/teacher/students").set(h.as("clerk_ts_t")).expect(200);
    assert.equal(body.length, 2);
    // Upcoming lessons first (Alice today, Bob next week).
    assert.deepEqual(
      body.map((s: { firstName: string }) => s.firstName),
      ["Alice", "Bob"],
    );
    const a = body[0];
    assert.equal(a.lessonsCompleted, 1);
    assert.equal(a.upcoming, 1);
    assert.equal(a.country, "France");
    assert.equal(a.level, "B1");
    assert.equal(new Date(a.lastLessonAt).toISOString(), "2026-10-07T16:00:00.000Z");
    assert.equal(body[1].packageRemaining, 4);
    assert.equal(body[1].hadTrial, true);

    const d = await h.http().get(`/api/teacher/students/${bob.id}`).set(h.as("clerk_ts_t")).expect(200);
    assert.equal(d.body.student.firstName, "Bob");
    assert.equal(d.body.lessons.length, 3);
    const trial = d.body.lessons.find((l: { bookingId: string }) => l.bookingId === ids.trial);
    assert.equal(trial.report.topicsCovered, "Introductions");
    assert.equal(d.body.lessonsCompleted, 1);
    assert.equal(d.body.upcoming, 1);
    assert.equal(d.body.packageRemaining, 4);

    const stranger = await h.db.query.users.findFirst({ where: eq(h.schema.users.clerkId, "clerk_ts_stranger") });
    await h.http().get(`/api/teacher/students/${stranger!.id}`).set(h.as("clerk_ts_t")).expect(404);
    await h.http().get(`/api/teacher/students/${alice.id}`).set(h.as("clerk_ts_other")).expect(404);
    // The existing history endpoint still answers.
    const hist = await h.http().get(`/api/teacher/students/${alice.id}/history`).set(h.as("clerk_ts_t")).expect(200);
    assert.equal(hist.body.lessons, 1);
  });

  it("lesson report context: own lessons only, report included", async () => {
    const T = h.as("clerk_ts_t");
    const today = await h.http().get(`/api/teacher/lessons/${ids.today}`).set(T).expect(200);
    assert.equal(today.body.status, "confirmed");
    assert.equal(today.body.canComplete, false);
    assert.equal(today.body.report, null);
    assert.equal(today.body.history.lessons, 1);

    const trial = await h.http().get(`/api/teacher/lessons/${ids.trial}`).set(T).expect(200);
    assert.equal(trial.body.status, "completed");
    assert.equal(trial.body.attendance, "attended");
    assert.equal(trial.body.report.topicsCovered, "Introductions");

    await h.http().get(`/api/teacher/lessons/${ids.today}`).set(h.as("clerk_ts_other")).expect(403);
    await h.http().get(`/api/teacher/lessons/00000000-0000-4000-8000-000000000000`).set(T).expect(404);

    // After the lesson starts it can be ended, then the report is accepted.
    h.clock.set("2026-10-14T17:00:00Z");
    const later = await h.http().get(`/api/teacher/lessons/${ids.today}`).set(T).expect(200);
    assert.equal(later.body.canComplete, true);
    await h.http().put(`/api/bookings/${ids.today}/report`).set(T).send({ topicsCovered: "x" }).expect(400);
    await h.http().post(`/api/bookings/${ids.today}/complete`).set(T).send({ attendance: "late" }).expect(201);
    await h.http().put(`/api/bookings/${ids.today}/report`).set(T).send({ topicsCovered: "Negotiation phrases", privateFluency: 4 }).expect(200);
    const done = await h.http().get(`/api/teacher/lessons/${ids.today}`).set(T).expect(200);
    assert.equal(done.body.attendance, "late");
    assert.equal(done.body.report.privateFluency, 4);
    h.clock.set("2026-10-14T15:00:00Z");
  });

  it("earnings details: balances, ledger rows, monthly chart", async () => {
    const { body } = await h.http().get("/api/teacher/earnings/details").set(h.as("clerk_ts_t")).expect(200);
    // Alice's first lesson is past its 24 h refund window (available); today's is still pending.
    assert.equal(body.balances.availableCents, 2800);
    assert.equal(body.balances.availableLessons, 1);
    assert.equal(body.balances.pendingCents, 2800);
    assert.equal(body.balances.paidCents, 0);
    assert.equal(body.minWithdrawalCents, 2000);
    assert.equal(body.stripeConnected, true);
    assert.equal(body.rows.length, 2); // the free trial creates no earning
    const row = body.rows.find((r: { bookingId: string }) => r.bookingId === ids.past);
    assert.deepEqual(
      { gross: row.grossCents, commission: row.commissionCents, net: row.netCents, status: row.status, student: row.student.firstName, type: row.type },
      { gross: 3500, commission: 700, net: 2800, status: "available", student: "Alice", type: "single" },
    );
    assert.equal(body.monthly.length, 6);
    assert.deepEqual(body.monthly.at(-1), { month: "2026-10", netCents: 5600 });
    assert.deepEqual(body.payouts, []);
  });

  it("withdraw needs a finished Stripe account; then pays and shows in history", async () => {
    const T = h.as("clerk_ts_t");
    const refused = await h.http().post("/api/teacher/earnings/withdraw").set(T).expect(400);
    assert.match(refused.body.message, /Stripe/);
    account = { details_submitted: true, payouts_enabled: true, capabilities: { transfers: "active" }, requirements: { currently_due: [] }, external_accounts: { data: [{ bank_name: "CHASE", last4: "4821" }] } };
    const paid = await h.http().post("/api/teacher/earnings/withdraw").set(T).expect(201);
    assert.equal(paid.body.amountCents, 2800);
    const { body } = await h.http().get("/api/teacher/earnings/details").set(T).expect(200);
    assert.equal(body.balances.availableCents, 0);
    assert.equal(body.balances.paidCents, 2800);
    assert.equal(body.balances.paidThisYearCents, 2800);
    assert.equal(body.payouts.length, 1);
    assert.equal(body.payouts[0].status, "paid");
    assert.equal(body.payouts[0].lessons, 1);
    assert.equal(body.payouts[0].onDemand, true);
  });

  it("Stripe Connect: onboarding link, account saved, status", async () => {
    const newbie = await h.seedTeacher("clerk_ts_new", { stripeAccountId: null });
    const N = h.as("clerk_ts_new");
    const s0 = await h.http().get("/api/teacher/payouts/status").set(N).expect(200);
    assert.deepEqual(s0.body, { connected: false, detailsSubmitted: false, payoutsEnabled: false, requirementsDue: 0, destination: null });
    await h.http().post("/api/teacher/payouts/dashboard").set(N).expect(400);

    const { body } = await h.http().post("/api/teacher/payouts/connect").set(N).expect(201);
    assert.equal(body.url, "https://connect.stripe.test/onboarding");
    const last = onboarding.at(-1)!;
    assert.equal(last.accountId, null);
    assert.equal(last.returnUrl, "https://amerivo.test/teacher/earnings?connect=done");
    const [p] = await h.db.select().from(h.schema.teacherProfiles).where(eq(h.schema.teacherProfiles.userId, newbie.id));
    assert.equal(p.stripeAccountId, "acct_new_1");

    // Coming back: the same account is resumed, status read from Stripe.
    await h.http().post("/api/teacher/payouts/connect").set(N).expect(201);
    assert.equal(onboarding.at(-1)!.accountId, "acct_new_1");
    const s1 = await h.http().get("/api/teacher/payouts/status").set(N).expect(200);
    assert.deepEqual(s1.body, { connected: true, detailsSubmitted: true, payoutsEnabled: true, requirementsDue: 0, destination: { name: "CHASE", last4: "4821" } });
    const dash = await h.http().post("/api/teacher/payouts/dashboard").set(N).expect(201);
    assert.equal(dash.body.url, "https://connect.stripe.test/dashboard");
  });
});
