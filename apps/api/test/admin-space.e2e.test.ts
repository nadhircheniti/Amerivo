import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createTestApp } from "./harness";

describe("admin space & disputes", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  const ids = { admin: "", teacher: "", teacher2: "", ana: "", ben: "" };
  const admin = () => h.as("clerk_admin");

  /** Confirmed booking, then completed by the teacher at `endIso`. */
  async function completed(studentId: string, startsAt: string, endIso: string, teacherClerk = "clerk_sarah", teacherId = ids.teacher, p: Record<string, unknown> = {}) {
    const b = await h.seedBooking(studentId, teacherId, { startsAt: new Date(startsAt), ...p });
    h.clock.set(endIso);
    await h.http().post(`/api/bookings/${b.id}/complete`).set(h.as(teacherClerk)).send({}).expect(201);
    return b;
  }

  before(async () => {
    h = await createTestApp({ now: "2026-10-01T00:00:00Z" });
    ids.admin = (await h.seedAdmin()).id;
    ids.teacher = (await h.seedTeacher("clerk_sarah", { firstName: "Sarah" })).id;
    ids.teacher2 = (await h.seedTeacher("clerk_mike", { firstName: "Mike" })).id;
    ids.ana = (await h.seedStudent("clerk_ana", { firstName: "Ana", lastName: "Costa", country: "Brazil" })).id;
    ids.ben = (await h.seedStudent("clerk_ben", { firstName: "Ben", lastName: "Lee", country: "Korea" })).id;
  });
  after(() => h.close());

  it("admin endpoints are admin-only", async () => {
    for (const path of [
      "/api/admin/overview",
      "/api/admin/badges",
      "/api/admin/students",
      "/api/admin/bookings",
      "/api/admin/payments",
      "/api/admin/audit-logs",
      "/api/admin/settings",
      "/api/admin/disputes",
    ]) {
      await h.http().get(path).set(h.as("clerk_ana")).expect(403);
      await h.http().get(path).set(h.as("clerk_sarah")).expect(403);
    }
  });

  it("student opens a dispute within 24 h; one per booking; access rules", async () => {
    const b = await completed(ids.ana, "2026-10-14T16:00:00Z", "2026-10-14T16:50:00Z");
    h.clock.set("2026-10-15T10:00:00Z");
    const url = `/api/bookings/${b.id}/dispute`;

    // Nothing reported yet → JSON null.
    const none = await h.http().get(url).set(h.as("clerk_ana")).expect(200);
    assert.equal(none.body, null);

    await h.http().post(url).set(h.as("clerk_ana")).send({ reason: "too short" }).expect(400);
    await h.http().post(url).set(h.as("clerk_ana")).send({ reason: "The teacher's connection dropped for 20 minutes.", extra: 1 }).expect(400);
    await h.http().post(url).set(h.as("clerk_ben")).send({ reason: "The teacher's connection dropped for 20 minutes." }).expect(403);
    await h.http().post(url).set(h.as("clerk_sarah")).send({ reason: "The teacher's connection dropped for 20 minutes." }).expect(403);

    const res = await h.http().post(url).set(h.as("clerk_ana")).send({ reason: "  The teacher's connection dropped for 20 minutes.  " }).expect(201);
    assert.equal(res.body.status, "open");
    assert.equal(res.body.bookingId, b.id);
    assert.equal(res.body.reason, "The teacher's connection dropped for 20 minutes.");
    assert.ok(res.body.id && res.body.createdAt);

    await h.http().post(url).set(h.as("clerk_ana")).send({ reason: "Second report for the same lesson" }).expect(409);

    const mine = await h.http().get(url).set(h.as("clerk_ana")).expect(200);
    assert.equal(mine.body.id, res.body.id);
    const asAdmin = await h.http().get(url).set(admin()).expect(200);
    assert.equal(asAdmin.body.id, res.body.id);
    await h.http().get(url).set(h.as("clerk_sarah")).expect(403);
    await h.http().get(url).set(h.as("clerk_ben")).expect(403);

    // The teacher's earning is held while the dispute is open.
    const [earning] = await h.db.select().from(h.schema.earnings).where(eq(h.schema.earnings.bookingId, b.id));
    assert.equal(earning.status, "pending");
    assert.equal(earning.availableAt, null);

    // Admins are notified.
    const notes = await h.db.select().from(h.schema.notifications).where(eq(h.schema.notifications.userId, ids.admin));
    assert.ok(notes.some((n) => n.type === "dispute_opened"));
  });

  it("disputes are refused after 24 h and for lessons that were not taught", async () => {
    const late = await completed(ids.ben, "2026-10-21T16:00:00Z", "2026-10-21T16:50:00Z");
    h.clock.set("2026-10-22T17:00:00Z");
    await h.http().post(`/api/bookings/${late.id}/dispute`).set(h.as("clerk_ben")).send({ reason: "The lesson was not what I expected." }).expect(400);

    const upcoming = await h.seedBooking(ids.ben, ids.teacher, { startsAt: new Date("2026-11-04T17:00:00Z") });
    await h.http().post(`/api/bookings/${upcoming.id}/dispute`).set(h.as("clerk_ben")).send({ reason: "The lesson was not what I expected." }).expect(400);
    await h.http().post(`/api/bookings/00000000-0000-0000-0000-000000000000/dispute`).set(h.as("clerk_ben")).send({ reason: "The lesson was not what I expected." }).expect(404);
  });

  it("admin lists disputes and refunds one even after the 24 h window", async () => {
    const list = await h.http().get("/api/admin/disputes?status=open").set(admin()).expect(200);
    assert.equal(list.body.length, 1);
    const d = list.body[0];
    assert.equal(d.student.firstName, "Ana");
    assert.equal(d.teacher.firstName, "Sarah");
    assert.equal(d.amountCents, 3500);
    assert.equal(d.paymentStatus, "succeeded");
    assert.equal(new Date(d.lessonDate).toISOString(), "2026-10-14T16:00:00.000Z");
    assert.ok(d.ageHours >= 0);

    const badges = await h.http().get("/api/admin/badges").set(admin()).expect(200);
    assert.equal(badges.body.openDisputes, 1);

    // Two days after the lesson: outside the normal refund window, but the dispute was opened in time.
    h.clock.set("2026-10-16T18:00:00Z");
    await h.http().post(`/api/admin/disputes/${d.id}/resolve`).set(admin()).send({ decision: "maybe" }).expect(400);
    await h.http().post(`/api/admin/disputes/${d.id}/resolve`).set(h.as("clerk_ana")).send({ decision: "refund" }).expect(403);
    const refundsBefore = h.stripeCalls.refunds.length;
    const res = await h.http().post(`/api/admin/disputes/${d.id}/resolve`).set(admin()).send({ decision: "refund", note: "Connection issue confirmed." }).expect(201);
    assert.equal(res.body.status, "refunded");
    assert.equal(res.body.refundedCents, 3500);
    assert.equal(h.stripeCalls.refunds.length, refundsBefore + 1);
    assert.equal(h.stripeCalls.refunds.at(-1)!.amount, 3500);

    const [booking] = await h.db.select().from(h.schema.bookings).where(eq(h.schema.bookings.id, d.bookingId));
    assert.equal(booking.status, "refunded");
    const [earning] = await h.db.select().from(h.schema.earnings).where(eq(h.schema.earnings.bookingId, d.bookingId));
    assert.equal(earning.status, "reversed");
    const [payment] = await h.db.select().from(h.schema.payments).where(eq(h.schema.payments.bookingId, d.bookingId));
    assert.equal(payment.status, "refunded");
    const [row] = await h.db.select().from(h.schema.disputes).where(eq(h.schema.disputes.id, d.id));
    assert.equal(row.status, "refunded");
    assert.equal(row.resolution, "Connection issue confirmed.");
    assert.equal(row.resolvedBy, ids.admin);

    const teacherNotes = await h.db.select().from(h.schema.notifications).where(eq(h.schema.notifications.userId, ids.teacher));
    assert.ok(teacherNotes.some((n) => n.type === "dispute_refunded"));
    const studentNotes = await h.db.select().from(h.schema.notifications).where(eq(h.schema.notifications.userId, ids.ana));
    assert.ok(studentNotes.some((n) => n.type === "refund"));

    await h.http().post(`/api/admin/disputes/${d.id}/resolve`).set(admin()).send({ decision: "reject" }).expect(409);
    const student = await h.http().get(`/api/bookings/${d.bookingId}/dispute`).set(h.as("clerk_ana")).expect(200);
    assert.equal(student.body.status, "refunded");
    const refunded = await h.http().get("/api/admin/disputes?status=refunded").set(admin()).expect(200);
    assert.equal(refunded.body.length, 1);
    assert.equal(refunded.body[0].resolvedBy, "Ada Admin");
  });

  it("admin rejects a dispute on a no-show lesson; the earning is released", async () => {
    const b = await h.seedBooking(ids.ben, ids.teacher2, { startsAt: new Date("2026-10-28T16:00:00Z") });
    h.clock.set("2026-10-28T16:30:00Z");
    await h.http().post(`/api/bookings/${b.id}/complete`).set(h.as("clerk_mike")).send({ attendance: "no_show" }).expect(201);
    h.clock.set("2026-10-28T20:00:00Z");
    const opened = await h.http().post(`/api/bookings/${b.id}/dispute`).set(h.as("clerk_ben")).send({ reason: "I was in the room but the teacher never came." }).expect(201);

    h.clock.set("2026-10-30T09:00:00Z");
    const res = await h
      .http()
      .post(`/api/admin/disputes/${opened.body.id}/resolve`)
      .set(admin())
      .send({ decision: "reject", note: "Recording shows the student did not join." })
      .expect(201);
    assert.equal(res.body.status, "rejected");
    const [row] = await h.db.select().from(h.schema.disputes).where(eq(h.schema.disputes.id, opened.body.id));
    assert.equal(row.status, "rejected");
    const [earning] = await h.db.select().from(h.schema.earnings).where(eq(h.schema.earnings.bookingId, b.id));
    assert.equal(earning.status, "pending");
    assert.equal(new Date(earning.availableAt!).toISOString(), "2026-10-30T09:00:00.000Z");
    const [booking] = await h.db.select().from(h.schema.bookings).where(eq(h.schema.bookings.id, b.id));
    assert.equal(booking.status, "no_show");
    const studentNotes = await h.db.select().from(h.schema.notifications).where(eq(h.schema.notifications.userId, ids.ben));
    assert.ok(studentNotes.some((n) => n.type === "dispute_rejected"));
    const teacherNotes = await h.db.select().from(h.schema.notifications).where(eq(h.schema.notifications.userId, ids.teacher2));
    assert.ok(teacherNotes.some((n) => n.type === "dispute_rejected"));
  });

  it("an open dispute makes a no-show lesson refundable through the booking refund endpoint", async () => {
    const b = await h.seedBooking(ids.ana, ids.teacher2, { startsAt: new Date("2026-11-04T16:00:00Z") });
    h.clock.set("2026-11-04T16:30:00Z");
    await h.http().post(`/api/bookings/${b.id}/complete`).set(h.as("clerk_mike")).send({ attendance: "no_show" }).expect(201);
    // Without a dispute, a no-show lesson can't be refunded.
    await h.http().post(`/api/admin/bookings/${b.id}/refund`).set(admin()).send({ reason: "Goodwill" }).expect(400);
    h.clock.set("2026-11-05T10:00:00Z");
    await h.http().post(`/api/bookings/${b.id}/dispute`).set(h.as("clerk_ana")).send({ reason: "The teacher marked me absent but I was there." }).expect(201);
    h.clock.set("2026-11-07T10:00:00Z");
    await h.http().post(`/api/admin/bookings/${b.id}/refund`).set(admin()).send({ reason: "Student was present" }).expect(201);
    const [row] = await h.db.select().from(h.schema.disputes).where(eq(h.schema.disputes.bookingId, b.id));
    assert.equal(row.status, "refunded");
  });

  it("bookings list: filters, search, dispute flag, pagination, admin cancel", async () => {
    h.clock.set("2026-10-10T00:00:00Z");
    // 21 extra upcoming confirmed bookings for Ben with Sarah (distinct slots).
    for (let i = 0; i < 21; i++) await h.seedBooking(ids.ben, ids.teacher, { startsAt: new Date(Date.UTC(2026, 11, 1 + i, 16)) });

    const all = await h.http().get("/api/admin/bookings").set(admin()).expect(200);
    assert.equal(all.body.pageSize, 20);
    assert.equal(all.body.items.length, 20);
    assert.ok(all.body.total >= 26);
    const page2 = await h.http().get("/api/admin/bookings?page=2").set(admin()).expect(200);
    assert.equal(page2.body.items.length, all.body.total - 20);
    assert.ok(!page2.body.items.some((x: { id: string }) => all.body.items.some((y: { id: string }) => y.id === x.id)));

    const disputed = await h.http().get("/api/admin/bookings?status=disputed").set(admin()).expect(200);
    assert.equal(disputed.body.total, 3);
    assert.ok(disputed.body.items.every((x: { dispute: unknown }) => x.dispute));

    const mike = await h.http().get("/api/admin/bookings?search=mike").set(admin()).expect(200);
    assert.equal(mike.body.total, 2);
    assert.ok(mike.body.items.every((x: { teacher: { name: string } }) => x.teacher.name === "Mike Cher"));

    const range = await h.http().get("/api/admin/bookings?status=confirmed&from=2026-12-01T00:00:00Z&to=2026-12-05T00:00:00Z").set(admin()).expect(200);
    assert.equal(range.body.total, 4);
    const first = range.body.items[0];
    assert.equal(first.student.name, "Ben Lee");
    assert.equal(first.type, "single");
    assert.equal(first.amountCents, 3500);
    assert.equal(first.paymentStatus, "succeeded");
    assert.equal(first.canCancel, true);
    assert.equal(first.canRefund, false);
    await h.http().get("/api/admin/bookings?from=nope").set(admin()).expect(400);

    // Admin cancels through the shared endpoint → full refund.
    const cancel = await h.http().post(`/api/bookings/${first.id}/cancel`).set(admin()).send({ reason: "Teacher unavailable" }).expect(201);
    assert.equal(cancel.body.status, "refunded");
    const after = await h
      .http()
      .get(`/api/admin/bookings?status=refunded&search=${first.id.slice(0, 8)}`)
      .set(admin())
      .expect(200);
    assert.equal(after.body.total, 1);
    assert.equal(after.body.items[0].cancelledBy, "admin");
  });

  it("students list with search, status filter and block / unblock", async () => {
    const list = await h.http().get("/api/admin/students").set(admin()).expect(200);
    assert.equal(list.body.total, 2);
    const ana = list.body.items.find((s: { firstName: string }) => s.firstName === "Ana");
    assert.equal(ana.email, "clerk_ana@example.com");
    assert.equal(ana.country, "Brazil");
    assert.equal(ana.status, "active");
    assert.equal(ana.lessonsCompleted, 0); // her lessons were refunded / no-show
    assert.ok(ana.joinedAt);
    const ben = list.body.items.find((s: { firstName: string }) => s.firstName === "Ben");
    assert.equal(ben.lessonsCompleted, 1);
    assert.ok(ben.totalPaidCents > 0);

    const search = await h.http().get("/api/admin/students?search=cost").set(admin()).expect(200);
    assert.equal(search.body.total, 1);

    await h.http().post(`/api/admin/users/${ids.ana}/status`).set(admin()).send({ status: "blocked" }).expect(201);
    const blocked = await h.http().get("/api/admin/students?status=blocked").set(admin()).expect(200);
    assert.deepEqual(
      blocked.body.items.map((s: { id: string }) => s.id),
      [ids.ana],
    );
    assert.equal(blocked.body.counts.blocked, 1);
    await h.http().get("/api/me").set(h.as("clerk_ana")).expect(403);
    await h.http().post(`/api/admin/users/${ids.ana}/status`).set(admin()).send({ status: "active" }).expect(201);

    const detail = await h.http().get(`/api/admin/students/${ids.ben}`).set(admin()).expect(200);
    assert.equal(detail.body.firstName, "Ben");
    assert.ok(detail.body.bookings.length > 0);
    assert.ok(detail.body.payments.length > 0);
    assert.equal(detail.body.disputes.length, 1);
    await h.http().get(`/api/admin/students/${ids.teacher}`).set(admin()).expect(404);
  });

  it("overview, payments, audit log and settings", async () => {
    h.clock.set("2026-12-20T00:00:00Z");
    const o = await h.http().get("/api/admin/overview?days=365").set(admin()).expect(200);
    assert.equal(o.body.totalStudents, 2);
    assert.equal(o.body.activeTeachers, 2);
    assert.equal(o.body.pendingApplications, 0);
    assert.equal(o.body.lessonsCompleted, 1); // Ben's late lesson
    assert.equal(o.body.openDisputes, 0);
    assert.equal(o.body.commissionRate, 0.25);
    assert.equal(o.body.months.length, 12);
    assert.equal(o.body.months.at(-1).month, "2026-12");
    assert.equal(o.body.months.find((m: { month: string }) => m.month === "2026-10").lessons, 1);
    assert.equal(o.body.latestBookings.length, 5);
    assert.ok(o.body.revenueCents > 0);
    assert.ok(o.body.commissionCents > 0);
    assert.ok(o.body.payoutsDue.cents > 0);
    assert.equal(new Date(o.body.payoutsDue.date).toISOString(), "2026-12-28T00:00:00.000Z");
    assert.ok("retentionRate" in o.body && "conversionRate" in o.body);

    const p = await h.http().get("/api/admin/payments").set(admin()).expect(200);
    assert.ok(p.body.payments.total >= 26);
    assert.equal(p.body.payments.items.length, 20);
    assert.ok(p.body.payments.items[0].student.name);
    assert.ok(p.body.totals.refundedCents >= 3500 * 3);
    assert.equal(p.body.totals.netCents, p.body.totals.grossCents - p.body.totals.refundedCents);
    assert.equal(p.body.payouts.items.length, 0);
    const run = await h.http().post("/api/admin/payouts/run").set(admin()).expect(201);
    assert.ok(run.body.length >= 1);
    const p2 = await h.http().get("/api/admin/payments").set(admin()).expect(200);
    assert.ok(p2.body.payouts.items.length >= 1);
    assert.equal(p2.body.payouts.items[0].status, "paid");
    assert.ok(p2.body.payouts.items[0].teacher.name);
    assert.ok(p2.body.totals.paidOutCents > 0);

    const logs = await h.http().get("/api/admin/audit-logs").set(admin()).expect(200);
    assert.ok(logs.body.total >= 5);
    const reject = logs.body.items.find((l: { action: string }) => l.action === "dispute.reject");
    assert.equal(reject.actor.name, "Ada Admin");
    assert.ok(logs.body.items.some((l: { action: string }) => l.action === "user.blocked"));
    const onlyUsers = await h.http().get("/api/admin/audit-logs?entity=user").set(admin()).expect(200);
    assert.ok(onlyUsers.body.items.every((l: { entity: string }) => l.entity === "user"));

    const s = await h.http().get("/api/admin/settings").set(admin()).expect(200);
    assert.equal(s.body.commissionRate, 0.25);
    assert.deepEqual(s.body.priceRangeCents, { min: 2000, max: 5000 });
    assert.deepEqual(s.body.packDiscounts, [
      { lessons: 5, discountPct: 5 },
      { lessons: 10, discountPct: 10 },
    ]);
    assert.equal(s.body.trialMinutes, 20);
    assert.equal(s.body.freeCancellationHours, 24);
    assert.equal(s.body.refundWindowHours, 24);
    assert.equal(s.body.minStudentAge, 13);
    assert.equal(s.body.payoutDay, 28);
    assert.equal(s.body.minWithdrawalCents, 2000);
  });
});
