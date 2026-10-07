/** One-time discount codes: admin management, checkout preview, booking, release, teacher earnings. */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { createTestApp } from "./harness";

describe("discount codes", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  let teacher: { id: string };
  const A = () => h.as("clerk_dc_admin");
  const S1 = () => h.as("clerk_dc_s1");
  const S2 = () => h.as("clerk_dc_s2");
  // The seeded teacher is free on Wednesdays 11:00–13:00 Chicago = 16:00/17:00 UTC in October,
  // 17:00/18:00 UTC in November (US clocks change on Nov 1).
  const slot = (day: string, hour = 16) => `2026-10-${day}T${hour}:00:00.000Z`;
  const codeRow = async (code: string) => (await h.db.select().from(h.schema.discountCodes).where(eq(h.schema.discountCodes.code, code)))[0];
  const create = (body: Record<string, unknown>) => h.http().post("/api/admin/discount-codes").set(A()).send(body);
  const book = (as: ReturnType<typeof S1>, body: Record<string, unknown>) => h.http().post("/api/bookings").set(as).send({ teacherSlug: "clerk-dc-t", offer: "single", ...body });

  before(async () => {
    h = await createTestApp({ now: "2026-10-01T10:00:00Z" });
    await h.seedAdmin("clerk_dc_admin");
    teacher = await h.seedTeacher("clerk_dc_t", { offersPack5: true });
    await h.seedStudent("clerk_dc_s1", { firstName: "Sam" });
    await h.seedStudent("clerk_dc_s2", { firstName: "Lea" });
  });
  after(() => h?.close());

  it("only admins manage codes; percent 1–100; random or custom code; no duplicates", async () => {
    await h.http().get("/api/admin/discount-codes").set(S1()).expect(403);
    await h.http().post("/api/admin/discount-codes").set(S1()).send({ percent: 10 }).expect(403);
    for (const percent of [0, 101, 12.5, "50"]) await create({ percent }).expect(400);
    await create({ percent: 10, code: "a!" }).expect(400);
    await create({ percent: 10, expiresAt: "2026-09-01T00:00:00Z" }).expect(400);

    const random = await create({ percent: 100, note: "Gift for Sam" }).expect(201);
    assert.match(random.body.code, /^AMV-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    assert.equal(random.body.status, "available");
    h.clock.set("2026-10-01T10:01:00Z"); // newest first
    const custom = await create({ percent: 20, code: " welcome20 " }).expect(201);
    assert.equal(custom.body.code, "WELCOME20");
    await create({ percent: 30, code: "WELCOME20" }).expect(409);

    const list = await h.http().get("/api/admin/discount-codes").set(A()).expect(200);
    assert.deepEqual(
      list.body.codes.map((c: { code: string; percent: number }) => [c.code, c.percent]),
      [
        ["WELCOME20", 20],
        [random.body.code, 100],
      ],
    );
    const audit = await h.db.select().from(h.schema.auditLogs).where(eq(h.schema.auditLogs.action, "discount.create"));
    assert.equal(audit.length, 2);
  });

  it("checkout preview: new price, same message for every invalid code, not for trials", async () => {
    await h.http().post("/api/discount-codes/check").set(A()).send({ code: "WELCOME20", teacherSlug: "clerk-dc-t", offer: "single" }).expect(403);
    const ok = await h.http().post("/api/discount-codes/check").set(S1()).send({ code: "welcome20", teacherSlug: "clerk-dc-t", offer: "single" }).expect(200);
    assert.deepEqual(ok.body, { code: "WELCOME20", percent: 20, totalCents: 3500, discountCents: 700, paidCents: 2800 });
    const pack = await h.http().post("/api/discount-codes/check").set(S1()).send({ code: "WELCOME20", teacherSlug: "clerk-dc-t", offer: "pack5" }).expect(200);
    assert.equal(pack.body.totalCents, 16625);
    assert.equal(pack.body.paidCents, 13300);
    const bad = await h.http().post("/api/discount-codes/check").set(S1()).send({ code: "NOPE-1234", teacherSlug: "clerk-dc-t", offer: "single" }).expect(400);
    assert.equal(bad.body.message, "This code is not valid or has already been used.");
    await h.http().post("/api/discount-codes/check").set(S1()).send({ code: "WELCOME20", teacherSlug: "clerk-dc-t", offer: "trial" }).expect(400);
    assert.equal((await codeRow("WELCOME20")).claimedAt, null, "a preview doesn't reserve the code");
  });

  it("a 100 % code books a free, confirmed lesson; the teacher is still paid on the full price", async () => {
    const [gift] = (await h.http().get("/api/admin/discount-codes").set(A()).expect(200)).body.codes.filter((c: { percent: number }) => c.percent === 100);
    const res = await book(S1(), { startsAt: slot("14"), discountCode: gift.code.toLowerCase() }).expect(201);
    assert.equal(res.body.booking.status, "confirmed");
    assert.equal(res.body.booking.priceCents, 0);
    assert.equal(res.body.booking.earningBaseCents, 3500);
    assert.equal(res.body.payment, null);
    assert.equal(h.stripeCalls.intents, 0, "nothing to charge");

    // One shot: nobody can use it again.
    const again = await book(S2(), { startsAt: slot("14", 17), discountCode: gift.code }).expect(400);
    assert.equal(again.body.message, "This code is not valid or has already been used.");
    const list = await h.http().get("/api/admin/discount-codes").set(A()).expect(200);
    const used = list.body.codes.find((c: { id: string }) => c.id === gift.id);
    assert.equal(list.body.usedCount, 1);
    assert.equal(list.body.discountedCents, 3500, "what the code cost Amerivo");
    assert.equal(used.status, "used");
    assert.equal(used.claimedBy.firstName, "Sam");

    // After the lesson, the teacher earns 75 % of $35 (Amerivo bears the discount).
    h.clock.set("2026-10-14T16:51:00Z");
    await h.http().post(`/api/bookings/${res.body.booking.id}/complete`).set(h.as("clerk_dc_t")).send({}).expect(201);
    const [earning] = await h.db.select().from(h.schema.earnings).where(eq(h.schema.earnings.bookingId, res.body.booking.id));
    assert.deepEqual({ gross: earning.grossCents, commission: earning.commissionCents, net: earning.netCents }, { gross: 3500, commission: 875, net: 2625 });
    h.clock.set("2026-10-01T10:00:00Z");
  });

  it("a partial code: the student pays the reduced price; an unpaid checkout gives the code back", async () => {
    const res = await book(S2(), { startsAt: slot("21"), discountCode: "WELCOME20" }).expect(201);
    assert.equal(res.body.booking.status, "pending_payment");
    assert.equal(res.body.payment.amountCents, 2800);
    assert.equal(res.body.booking.priceCents, 2800);
    let row = (await h.http().get("/api/admin/discount-codes").set(A()).expect(200)).body.codes.find((c: { code: string }) => c.code === "WELCOME20");
    assert.equal(row.status, "reserved");
    await book(S1(), { startsAt: slot("21", 17), discountCode: "WELCOME20" }).expect(400);

    // Not paid within the hold: the slot and the code are both released.
    h.clock.set("2026-10-01T11:00:00Z");
    await h.http().get("/api/bookings").set(S2()).expect(200);
    assert.equal((await h.db.select().from(h.schema.bookings).where(eq(h.schema.bookings.id, res.body.booking.id)))[0].status, "cancelled");
    row = (await h.http().get("/api/admin/discount-codes").set(A()).expect(200)).body.codes.find((c: { code: string }) => c.code === "WELCOME20");
    assert.equal(row.status, "available");

    // Used again, paid this time.
    const paid = await book(S1(), { startsAt: slot("21", 17), discountCode: "WELCOME20" }).expect(201);
    await h
      .http()
      .post("/api/webhooks/stripe")
      .set("stripe-signature", "t")
      .send({ id: "evt_dc_1", type: "payment_intent.succeeded", data: { object: { id: `pi_${h.stripeCalls.intents}` } } })
      .expect(200);
    assert.equal((await h.db.select().from(h.schema.bookings).where(eq(h.schema.bookings.id, paid.body.booking.id)))[0].status, "confirmed");
    row = (await h.http().get("/api/admin/discount-codes").set(A()).expect(200)).body.codes.find((c: { code: string }) => c.code === "WELCOME20");
    assert.equal(row.status, "used");
  });

  it("two students using the same code at the same moment: only one gets it", async () => {
    const { body } = await create({ percent: 100 }).expect(201);
    const [a, b] = await Promise.all([book(S1(), { startsAt: slot("28"), discountCode: body.code }), book(S2(), { startsAt: slot("28", 17), discountCode: body.code })]);
    assert.deepEqual([a.status, b.status].sort(), [201, 400]);
  });

  it("cancelling a free lesson more than 24 h before gives the code back; a disabled code can't be used", async () => {
    const { body: code } = await create({ percent: 100, code: "SORRY100" }).expect(201);
    const res = await book(S2(), { startsAt: "2026-11-04T17:00:00.000Z", discountCode: "SORRY100" }).expect(201);
    await h.http().post(`/api/bookings/${res.body.booking.id}/cancel`).set(S2()).send({}).expect(201);
    assert.equal((await codeRow("SORRY100")).claimedAt, null);

    await h.http().post(`/api/admin/discount-codes/${code.id}/disable`).set(A()).expect(200);
    await book(S2(), { startsAt: "2026-11-04T17:00:00.000Z", discountCode: "SORRY100" }).expect(400);
    const row = (await h.http().get("/api/admin/discount-codes").set(A()).expect(200)).body.codes.find((c: { code: string }) => c.code === "SORRY100");
    assert.equal(row.status, "disabled");
  });

  it("packages: the code applies to the package price; its lessons keep the teacher's full share", async () => {
    await create({ percent: 100, code: "PACKGIFT" }).expect(201);
    const res = await book(S1(), { offer: "pack5", startsAt: "2026-11-11T17:00:00.000Z", discountCode: "PACKGIFT" }).expect(201);
    assert.equal(res.body.package.totalCents, 0);
    assert.equal(res.body.package.status, "active");
    assert.equal(res.body.package.earningBaseCents, 16625);
    assert.equal(res.body.booking.status, "confirmed");
    assert.equal(res.body.booking.earningBaseCents, 3325);
    const next = await h
      .http()
      .post("/api/bookings")
      .set(S1())
      .send({ teacherSlug: "clerk-dc-t", offer: "from_package", packageId: res.body.package.id, startsAt: "2026-11-11T18:00:00.000Z" })
      .expect(201);
    assert.equal(next.body.booking.priceCents, 0);
    assert.equal(next.body.booking.earningBaseCents, 3325);
    // The teacher's page offers to book the lessons left in the package.
    const left = await h.http().get("/api/student/packages?teacher=clerk-dc-t").set(S1()).expect(200);
    assert.deepEqual(left.body, [{ id: res.body.package.id, lessonCount: 5, lessonsUsed: 2, remaining: 3 }]);
    assert.deepEqual((await h.http().get("/api/student/packages?teacher=clerk-dc-t").set(S2()).expect(200)).body, []);
    await h.http().get("/api/student/packages?teacher=clerk-dc-t").set(h.as("clerk_dc_t")).expect(403);
    // Codes don't apply to trials or package lessons.
    await book(S2(), { offer: "trial", startsAt: "2026-11-18T16:00:00.000Z", discountCode: "WHATEVER" }).expect(400);
    void teacher;
  });
});
