/**
 * End-to-end API test: real NestJS app + real PostgreSQL engine (PGlite, in-memory)
 * with the production migrations. Stripe and Daily.co are replaced by fakes.
 */
import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { Test } from "@nestjs/testing";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DB } from "../src/db/db";
import * as schema from "../src/db/schema";
import { CLOCK } from "../src/common/clock";
import { StripeService } from "../src/integrations/stripe.service";
import { DailyService } from "../src/integrations/daily.service";

process.env.DEV_AUTH = "1";
process.env.NODE_ENV = "test";
process.env.DAILY_DOMAIN = "amerivo.daily.co";

const clock = { t: new Date("2026-10-01T00:00:00Z"), now() { return this.t; }, set(iso: string) { this.t = new Date(iso); } };

const stripeCalls = { intents: 0, refunds: [] as { pi: string; amount: number }[], transfers: [] as { account: string; amount: number }[] };
let stripeConfigured = true;
let failNextIntent = false;
let identityResult = "processing";
const intentStatus: Record<string, string> = {};
const uncancellable = new Set<string>();
const fakeStripe = {
  isConfigured: () => stripeConfigured,
  createPaymentIntent: async (p: { amountCents: number }) => {
    if (failNextIntent) {
      failNextIntent = false;
      throw new Error("This API call cannot be made with a publishable API key.");
    }
    return { id: `pi_${++stripeCalls.intents}`, client_secret: `secret_${stripeCalls.intents}`, amount: p.amountCents };
  },
  refund: async (pi: string, amount: number) => { stripeCalls.refunds.push({ pi, amount }); return { id: `re_${stripeCalls.refunds.length}` }; },
  transferToTeacher: async (p: { accountId: string; amountCents: number }) => { stripeCalls.transfers.push({ account: p.accountId, amount: p.amountCents }); return { id: `tr_${stripeCalls.transfers.length}` }; },
  // PaymentIntent statuses as Stripe would report them (default: waiting for the card).
  retrieveIntent: async (id: string) => ({ id, status: intentStatus[id] ?? "requires_payment_method", client_secret: `secret_${id.slice(3)}` }),
  cancelIntent: async (id: string) => {
    if (intentStatus[id] === "succeeded" || uncancellable.has(id)) return null;
    intentStatus[id] = "canceled";
    return { id, status: "canceled" };
  },
  constructEvent: (raw: Buffer) => JSON.parse(raw.toString()),
  identitySession: async () => ({ id: "vs_test_1", url: "https://verify.stripe.test/session" }),
  retrieveIdentitySession: async (id: string) => ({ id, status: identityResult, last_error: null }),
};
const fakeDaily = {
  createRoom: async (p: { name: string }) => ({ name: p.name, url: `https://amerivo.daily.co/${p.name}` }),
  roomUrl: async (name: string) => `https://amerivo.daily.co/${name}`,
  meetingToken: async (p: { isOwner: boolean }) => ({ token: p.isOwner ? "owner-token" : "guest-token" }),
};

let app: INestApplication;
let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
const as = (clerkId: string) => ({ "x-dev-user": clerkId });
let http: () => ReturnType<typeof request>;

const ids = { admin: "", sarah: "", maria: "", ana: "" };

before(async () => {
  pg = new PGlite();
  db = drizzle(pg as never, { schema }); // cast: drizzle bundles its own PGlite typings
  await migrate(db, { migrationsFolder: "drizzle" });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB).useValue(db)
    .overrideProvider(CLOCK).useValue(clock)
    .overrideProvider(StripeService).useValue(fakeStripe)
    .overrideProvider(DailyService).useValue(fakeDaily)
    .compile();
  app = moduleRef.createNestApplication({ rawBody: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  http = () => request(app.getHttpServer());

  // Seed an admin and an approved teacher (Sarah, Austin) teaching Wednesdays 11:00–13:00 Chicago time.
  const [admin] = await db.insert(schema.users).values({ clerkId: "clerk_admin", role: "admin", status: "active", email: "admin@amerivo.test", firstName: "Ada", lastName: "Admin" }).returning();
  const [sarah] = await db.insert(schema.users).values({ clerkId: "clerk_sarah", role: "teacher", status: "active", email: "sarah@amerivo.test", firstName: "Sarah", lastName: "Mitchell", timezone: "America/Chicago" }).returning();
  await db.insert(schema.teacherProfiles).values({
    userId: sarah.id, slug: "sarah-mitchell", status: "approved", timezone: "America/Chicago", priceCents: 3500, offersTrial: true, offersPack5: true, offersPack10: true,
    specialties: ["Business English", "Interview Prep"], teaches: ["adults"], yearsExperience: 8, identityStatus: "verified", stripeAccountId: "acct_sarah", bio: "HR manager turned coach",
  });
  await db.insert(schema.availabilityRules).values([{ teacherId: sarah.id, weekday: 3, startMinute: 660, endMinute: 780 }]);
  ids.admin = admin.id;
  ids.sarah = sarah.id;
});

after(async () => {
  await app?.close();
  await pg?.close();
});

describe("Amerivo API", () => {
  it("health is public, everything else requires a session", async () => {
    await http().get("/api/health").expect(200);
    await http().get("/api/me").expect(401);
  });

  it("a student registers and saves placement answers", async () => {
    // Students must be 13 or older (clock: 2026-10-01).
    const young = await http().post("/api/me/register").set(as("clerk_kid")).send({ role: "student", email: "kid@example.com", firstName: "Kid", lastName: "Young", timezone: "Europe/Zurich", birthDate: "2013-10-02" }).expect(400);
    assert.match(young.body.message, /at least 13/);
    await http().post("/api/me/register").set(as("clerk_kid")).send({ role: "student", email: "kid@example.com", firstName: "Kid", lastName: "Young", timezone: "Europe/Zurich" }).expect(400);
    await http().post("/api/me/register").set(as("clerk_teen")).send({ role: "student", email: "teen@example.com", firstName: "Teen", lastName: "Ager", timezone: "Europe/Zurich", birthDate: "2013-10-01" }).expect(201);

    const res = await http().post("/api/me/register").set(as("clerk_maria")).send({ role: "student", email: "maria@example.com", firstName: "Maria", lastName: "Silva", country: "Brazil", timezone: "Europe/Zurich", birthDate: "1994-05-12" }).expect(201);
    ids.maria = res.body.id;
    assert.equal(res.body.status, "active");
    await http().post("/api/me/register").set(as("clerk_maria")).send({ role: "student", email: "maria@example.com", firstName: "Maria", lastName: "Silva", timezone: "Europe/Zurich", birthDate: "1994-05-12" }).expect(409);
    await http().put("/api/student/placement").set(as("clerk_maria")).send({ goal: "business", selfLevel: "intermediate", preferredTeacherGender: "no_preference", preferredTimes: ["morning"] }).expect(200);
    const result = await http().put("/api/student/placement/result").set(as("clerk_maria")).send({ grammar: "B1", reading: "B2", listening: "B1", speaking: "A2" }).expect(200);
    assert.equal(result.body.cefrLevel, "B1");
    const recs = await http().get("/api/student/recommendations").set(as("clerk_maria")).expect(200);
    assert.equal(recs.body[0].teacher.slug, "sarah-mitchell");
    assert.ok(recs.body[0].reasons.includes("Business English specialist"));
  });

  it("roles are enforced", async () => {
    await http().get("/api/admin/analytics").set(as("clerk_maria")).expect(403);
    await http().put("/api/teacher/availability").set(as("clerk_maria")).send({ rules: [] }).expect(403);
  });

  it("lists teachers and shows slots in the student's time zone", async () => {
    const list = await http().get("/api/teachers?specialties=Business%20English&maxPrice=40").expect(200);
    assert.equal(list.body.length, 1);
    const slots = await http().get("/api/teachers/sarah-mitchell/slots?from=2026-10-12T00:00:00Z&to=2026-10-18T23:59:59Z&tz=Europe/Zurich").expect(200);
    assert.deepEqual(slots.body.map((s: { local: string }) => s.local), ["2026-10-14T18:00:00.000+02:00", "2026-10-14T19:00:00.000+02:00"]);
  });

  let singleId = "";
  it("books a single lesson: pending payment → webhook → confirmed (idempotent)", async () => {
    const res = await http().post("/api/bookings").set(as("clerk_maria")).send({ teacherSlug: "sarah-mitchell", offer: "single", startsAt: "2026-10-14T16:00:00.000Z" }).expect(201);
    singleId = res.body.booking.id;
    assert.equal(res.body.booking.status, "pending_payment");
    assert.equal(res.body.payment.amountCents, 3500);
    assert.ok(res.body.payment.clientSecret);

    // The slot disappears for everyone else.
    const slots = await http().get("/api/teachers/sarah-mitchell/slots?from=2026-10-12T00:00:00Z&to=2026-10-18T23:59:59Z&tz=UTC").expect(200);
    assert.equal(slots.body.length, 1);

    // A second student can't take it.
    const [ana] = await db.insert(schema.users).values({ clerkId: "clerk_ana", role: "student", status: "active", email: "ana@example.com", firstName: "Ana", lastName: "Costa" }).returning();
    ids.ana = ana.id;
    await http().post("/api/bookings").set(as("clerk_ana")).send({ teacherSlug: "sarah-mitchell", offer: "single", startsAt: "2026-10-14T16:00:00.000Z" }).expect(409);

    const event = { id: "evt_1", type: "payment_intent.succeeded", data: { object: { id: "pi_1" } } };
    await http().post("/api/webhooks/stripe").set("stripe-signature", "test").send(event).expect(200);
    const dup = await http().post("/api/webhooks/stripe").set("stripe-signature", "test").send(event).expect(200);
    assert.equal(dup.body.duplicate, true);

    const upcoming = await http().get("/api/bookings").set(as("clerk_maria")).expect(200);
    const single = upcoming.body.find((b: { id: string }) => b.id === singleId);
    assert.equal(single.status, "confirmed");
    assert.equal(single.withFirstName, "Sarah");
    const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, ids.sarah));
    assert.ok(notes.some((n) => n.type === "new_booking"));
  });

  it("free trial is confirmed immediately, only once per teacher", async () => {
    const res = await http().post("/api/bookings").set(as("clerk_ana")).send({ teacherSlug: "sarah-mitchell", offer: "trial", startsAt: "2026-10-14T17:00:00.000Z" }).expect(201);
    assert.equal(res.body.booking.status, "confirmed");
    assert.equal(res.body.booking.durationMin, 20);
    assert.equal(res.body.payment, null);
    await http().post("/api/bookings").set(as("clerk_ana")).send({ teacherSlug: "sarah-mitchell", offer: "trial", startsAt: "2026-10-21T16:00:00.000Z" }).expect(400);
  });

  it("trial lessons are an opt-in setting of each teacher", async () => {
    await http().put("/api/teacher/profile").set(as("clerk_sarah")).send({ offersTrial: false }).expect(200);
    const off = await http().post("/api/bookings").set(as("clerk_maria")).send({ teacherSlug: "sarah-mitchell", offer: "trial", startsAt: "2026-10-21T16:00:00.000Z" }).expect(400);
    assert.match(off.body.message, /does not offer trial/);
    await http().get("/api/teachers/sarah-mitchell/slots?from=2026-10-19T00:00:00Z&to=2026-10-25T00:00:00Z&tz=UTC&trial=1").expect(400);
    await http().put("/api/teacher/profile").set(as("clerk_sarah")).send({ offersTrial: true }).expect(200);
    const profile = await http().get("/api/teachers/sarah-mitchell").expect(200);
    assert.equal(profile.body.offersTrial, true);
  });

  it("5-lesson package at −5%, then lessons booked from the package", async () => {
    const res = await http().post("/api/bookings").set(as("clerk_ana")).send({ teacherSlug: "sarah-mitchell", offer: "pack5", startsAt: "2026-10-21T16:00:00.000Z" }).expect(201);
    assert.equal(res.body.package.totalCents, 16625);
    assert.equal(res.body.payment.amountCents, 16625);
    await http().post("/api/webhooks/stripe").set("stripe-signature", "t").send({ id: "evt_2", type: "payment_intent.succeeded", data: { object: { id: "pi_2" } } }).expect(200);
    const next = await http().post("/api/bookings").set(as("clerk_ana")).send({ teacherSlug: "sarah-mitchell", offer: "from_package", packageId: res.body.package.id, startsAt: "2026-10-21T17:00:00.000Z" }).expect(201);
    assert.equal(next.body.booking.status, "confirmed");
    assert.equal(next.body.package.lessonsUsed, 2);
  });

  it("cancellation policy: < 24 h no refund, teacher cancellation refunds", async () => {
    // Ana's package lesson at 10-21 17:00Z, cancelled 10 hours before → no credit back.
    const [pkgLesson] = await db.select().from(schema.bookings).where(eq(schema.bookings.startsAt, new Date("2026-10-21T17:00:00Z")));
    clock.set("2026-10-21T07:00:00Z");
    const late = await http().post(`/api/bookings/${pkgLesson.id}/cancel`).set(as("clerk_ana")).send({}).expect(201);
    assert.equal(late.body.refundCents, 0);

    // Teacher cancels the package's first lesson → lesson credit returned to the package.
    const [first] = await db.select().from(schema.bookings).where(eq(schema.bookings.startsAt, new Date("2026-10-21T16:00:00Z")));
    const byTeacher = await http().post(`/api/bookings/${first.id}/cancel`).set(as("clerk_sarah")).send({ reason: "Sick" }).expect(201);
    assert.equal(byTeacher.body.refundMode, "package_credit");
    const [pkg] = await db.select().from(schema.lessonPackages).where(eq(schema.lessonPackages.id, first.packageId!));
    assert.equal(pkg.lessonsUsed, 1);
    clock.set("2026-10-01T00:00:00Z");
  });

  it("classroom → end lesson → report → review → earnings → payout", async () => {
    clock.set("2026-10-14T15:45:00Z"); // 15 min before: too early
    await http().post(`/api/bookings/${singleId}/join`).set(as("clerk_maria")).expect(400);
    // The classroom page gets names, times and the opening time before joining.
    const info = await http().get(`/api/bookings/${singleId}/classroom`).set(as("clerk_maria")).expect(200);
    assert.equal(info.body.role, "student");
    assert.equal(info.body.teacher.firstName, "Sarah");
    assert.equal(info.body.opensAt, "2026-10-14T15:50:00.000Z");
    await http().get(`/api/bookings/${singleId}/classroom`).set(as("clerk_ana")).expect(403);
    // Test site: CLASSROOM_EARLY_MIN opens it earlier.
    process.env.CLASSROOM_EARLY_MIN = "60";
    const early = await http().get(`/api/bookings/${singleId}/classroom`).set(as("clerk_maria")).expect(200);
    assert.equal(early.body.opensAt, "2026-10-14T15:00:00.000Z");
    delete process.env.CLASSROOM_EARLY_MIN;
    // Lessons are private: an admin can't enter the room.
    await http().post(`/api/bookings/${singleId}/join`).set(as("clerk_admin")).expect(403);
    clock.set("2026-10-14T15:52:00Z"); // 8 min before: open
    const join = await http().post(`/api/bookings/${singleId}/join`).set(as("clerk_sarah")).expect(201);
    assert.equal(join.body.token, "owner-token");
    assert.match(join.body.roomUrl, /amerivo\.daily\.co\/amerivo-/);
    await http().post(`/api/bookings/${singleId}/join`).set(as("clerk_ana")).expect(403);

    clock.set("2026-10-14T16:50:00Z");
    const done = await http().post(`/api/bookings/${singleId}/complete`).set(as("clerk_sarah")).send({ attendance: "attended" }).expect(201);
    assert.deepEqual(done.body.earning, { grossCents: 3500, commissionCents: 700, netCents: 2800 });

    await http()
      .put(`/api/bookings/${singleId}/report`)
      .set(as("clerk_sarah"))
      .send({ topicsCovered: "Leading a team meeting", strengths: "Clear structure", homework: "Write a meeting agenda", homeworkDue: "2026-10-15", recommendation: "Negotiation phrases", privateFluency: 3 })
      .expect(200);
    const seen = await http().get(`/api/bookings/${singleId}/report`).set(as("clerk_maria")).expect(200);
    assert.equal(seen.body.homework, "Write a meeting agenda");
    assert.equal(seen.body.privateFluency, undefined, "private rating hidden from the student");

    await http().post(`/api/bookings/${singleId}/review`).set(as("clerk_maria")).send({ rating: 5, comment: "Great lesson" }).expect(201);
    await http().post(`/api/bookings/${singleId}/review`).set(as("clerk_maria")).send({ rating: 4 }).expect(409);
    const profile = await http().get("/api/teachers/sarah-mitchell").expect(200);
    assert.equal(profile.body.ratingAvgX100, 500);
    assert.equal(profile.body.lessonsCompleted, 1);

    let e = await http().get("/api/teacher/earnings").set(as("clerk_sarah")).expect(200);
    assert.equal(e.body.pendingCents, 2800);
    assert.equal(e.body.availableCents, 0);

    clock.set("2026-10-15T17:00:00Z"); // after the 24 h refund window
    e = await http().get("/api/teacher/earnings").set(as("clerk_sarah")).expect(200);
    assert.equal(e.body.availableCents, 2800);
    assert.equal(e.body.nextPayoutDate, "2026-10-28T00:00:00.000Z");

    const payout = await http().post("/api/teacher/earnings/withdraw").set(as("clerk_sarah")).expect(201);
    assert.equal(payout.body.amountCents, 2800);
    assert.deepEqual(stripeCalls.transfers, [{ account: "acct_sarah", amount: 2800 }]);
    e = await http().get("/api/teacher/earnings").set(as("clerk_sarah")).expect(200);
    assert.equal(e.body.availableCents, 0);
    assert.equal(e.body.paidCents, 2800);

    // Admin refund window (24 h after the lesson) has passed.
    await http().post(`/api/admin/bookings/${singleId}/refund`).set(as("clerk_admin")).send({ reason: "Complaint" }).expect(400);
  });

  it("teacher application: submit requires video + identity; admin decides", async () => {
    await http().post("/api/me/register").set(as("clerk_james")).send({ role: "teacher", email: "james@example.com", firstName: "James", lastName: "Robinson", timezone: "America/Chicago" }).expect(201);
    await http().put("/api/teacher/profile").set(as("clerk_james")).send({ priceCents: 1500 }).expect(400);
    await http().put("/api/teacher/profile").set(as("clerk_james")).send({ priceCents: 2800, bio: "Conversation coach", specialties: ["Conversation"], offersPack5: true }).expect(200);
    const missing = await http().post("/api/teacher/application/submit").set(as("clerk_james")).expect(400);
    assert.match(missing.body.message, /introduction video/);
  });

  it("staging without Stripe: PAYMENTS_SIMULATED confirms bookings immediately", async () => {
    stripeConfigured = false;
    process.env.PAYMENTS_SIMULATED = "1";
    clock.set("2026-10-20T00:00:00Z");
    const res = await http().post("/api/bookings").set(as("clerk_maria")).send({ teacherSlug: "sarah-mitchell", offer: "single", startsAt: "2026-10-28T17:00:00.000Z" }).expect(201);
    assert.equal(res.body.booking.status, "confirmed");
    assert.equal(res.body.payment.simulated, true);
    delete process.env.PAYMENTS_SIMULATED;
    const without = await http().post("/api/bookings").set(as("clerk_maria")).send({ teacherSlug: "sarah-mitchell", offer: "single", startsAt: "2026-10-28T16:00:00.000Z" }).expect(201);
    assert.equal(without.body.booking.status, "pending_payment", "without the flag nothing is auto-confirmed");
    stripeConfigured = true;
    clock.set("2026-10-15T17:00:00Z");
  });

  it("admin analytics", async () => {
    const a = await http().get("/api/admin/analytics?days=60").set(as("clerk_admin")).expect(200);
    assert.equal(a.body.totalTeachers, 1);
    assert.equal(a.body.lessonsCompleted, 1);
    assert.ok(a.body.revenueCents >= 3500 + 16625);
    assert.equal(a.body.commissionCents, 700);
  });

  it("ADMIN_EMAILS: a listed, verified e-mail registers as admin (no date of birth needed)", async () => {
    process.env.ADMIN_EMAILS = "owner@amerivo.test, other@amerivo.test";
    const res = await http().post("/api/me/register").set(as("clerk_owner")).send({ role: "student", email: "Owner@amerivo.test", firstName: "Olivia", lastName: "Owner", timezone: "Europe/Zurich" }).expect(201);
    assert.equal(res.body.role, "admin");
    await http().get("/api/admin/analytics?days=30").set(as("clerk_owner")).expect(200);
    // An existing verified student whose e-mail is added later becomes admin on the next GET /me.
    process.env.ADMIN_EMAILS = "maria@example.com";
    const promoted = await http().get("/api/me").set(as("clerk_maria")).expect(200);
    assert.equal(promoted.body.role, "admin");
    delete process.env.ADMIN_EMAILS;
    await http().post("/api/me/register").set(as("clerk_other")).send({ role: "student", email: "other@amerivo.test", firstName: "O", lastName: "T", timezone: "Europe/Zurich" }).expect(400);
  });

  it("Stripe: confirmation without webhook, 30-min payment hold, resume, late payment refunded", async () => {
    clock.set("2026-10-20T00:00:00Z");
    const [bob] = await db.insert(schema.users).values({ clerkId: "clerk_bob", role: "student", status: "active", email: "bob@example.com", firstName: "Bob", lastName: "Lee" }).returning();
    const book = (who: string, startsAt: string) => http().post("/api/bookings").set(as(who)).send({ teacherSlug: "sarah-mitchell", offer: "single", startsAt });

    // 1. Paid on the checkout page → sync confirms at once; the later webhook is a no-op.
    const a = await book("clerk_ana", "2026-11-04T17:00:00.000Z").expect(201);
    const pi1 = (await db.select().from(schema.payments).where(eq(schema.payments.bookingId, a.body.booking.id)))[0].providerRef!;
    intentStatus[pi1] = "succeeded";
    const synced = await http().post(`/api/bookings/${a.body.booking.id}/sync-payment`).set(as("clerk_ana")).expect(201);
    assert.equal(synced.body.status, "confirmed");
    await http().post(`/api/bookings/${a.body.booking.id}/sync-payment`).set(as("clerk_bob")).expect(403);
    const late = await http().post("/api/webhooks/stripe").set("stripe-signature", "t").send({ id: "evt_sync_dup", type: "payment_intent.succeeded", data: { object: { id: pi1 } } }).expect(200);
    assert.equal(late.body.duplicate, true);

    // 2. Unpaid: the same student gets the same payment back; others can't take the slot.
    const b = await book("clerk_ana", "2026-11-04T18:00:00.000Z").expect(201);
    const again = await book("clerk_ana", "2026-11-04T18:00:00.000Z").expect(201);
    assert.equal(again.body.booking.id, b.body.booking.id);
    assert.equal(again.body.payment.clientSecret, b.body.payment.clientSecret);
    await book("clerk_bob", "2026-11-04T18:00:00.000Z").expect(409);

    // 3. After 30 minutes the hold is released: slot visible again, intent cancelled, Bob books it.
    clock.set("2026-10-20T00:31:00Z");
    const slots = await http().get("/api/teachers/sarah-mitchell/slots?from=2026-11-02T00:00:00Z&to=2026-11-08T00:00:00Z&tz=UTC").expect(200);
    assert.ok(slots.body.some((s: { startsAt: string }) => s.startsAt === "2026-11-04T18:00:00.000Z"));
    const c = await book("clerk_bob", "2026-11-04T18:00:00.000Z").expect(201);
    const [expired] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, b.body.booking.id));
    assert.equal(expired.status, "cancelled");
    assert.equal(expired.cancelReason, "Payment not completed in time");

    // 4. Bob cancels while Stripe was already charging him → the success that follows is refunded.
    const pi3 = (await db.select().from(schema.payments).where(eq(schema.payments.bookingId, c.body.booking.id)))[0].providerRef!;
    uncancellable.add(pi3);
    await http().post(`/api/bookings/${c.body.booking.id}/cancel`).set(as("clerk_bob")).send({}).expect(201);
    const refundsBefore = stripeCalls.refunds.length;
    await http().post("/api/webhooks/stripe").set("stripe-signature", "t").send({ id: "evt_late", type: "payment_intent.succeeded", data: { object: { id: pi3 } } }).expect(200);
    assert.equal(stripeCalls.refunds.length, refundsBefore + 1);
    assert.deepEqual(stripeCalls.refunds.at(-1), { pi: pi3, amount: 3500 });
    const [p3] = await db.select().from(schema.payments).where(eq(schema.payments.providerRef, pi3));
    assert.equal(p3.status, "refunded");
  });

  it("a failed Stripe call frees the slot at once; an old stuck booking is replaced on retry", async () => {
    clock.set("2026-10-20T00:00:00Z");
    const book = () => http().post("/api/bookings").set(as("clerk_ana")).send({ teacherSlug: "sarah-mitchell", offer: "single", startsAt: "2026-11-11T17:00:00.000Z" });

    // Wrong key on the server: clear error, and the slot is not left blocked.
    failNextIntent = true;
    const failed = await book().expect(503);
    assert.match(failed.body.message, /temporarily unavailable/);
    const ok = await book().expect(201);
    assert.equal(ok.body.booking.status, "pending_payment");
    assert.ok(ok.body.payment.clientSecret);

    // A booking stuck before this fix (unpaid, no PaymentIntent): the same student can book again.
    await db.update(schema.payments).set({ providerRef: null }).where(eq(schema.payments.bookingId, ok.body.booking.id));
    const again = await book().expect(201);
    assert.notEqual(again.body.booking.id, ok.body.booking.id);
    const [old] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, ok.body.booking.id));
    assert.equal(old.status, "cancelled");

    // Paid meanwhile (page closed before confirmation): retrying confirms instead of blocking.
    const pi = (await db.select().from(schema.payments).where(eq(schema.payments.bookingId, again.body.booking.id)))[0].providerRef!;
    intentStatus[pi] = "succeeded";
    const confirmed = await book().expect(201);
    assert.equal(confirmed.body.booking.id, again.body.booking.id);
    assert.equal(confirmed.body.booking.status, "confirmed");
  });

  it("teacher onboarding: application saved step by step, Stripe identity, submit, interview, approval", async () => {
    // A teacher account (no date of birth needed) starts as a draft.
    await http().post("/api/me/register").set(as("clerk_emma")).send({ role: "teacher", email: "emma@example.com", firstName: "Emma", lastName: "Stone", timezone: "America/New_York" }).expect(201);
    let me = await http().get("/api/me").set(as("clerk_emma")).expect(200);
    assert.equal(me.body.role, "teacher");
    assert.equal(me.body.teacherStatus, "draft");

    // Step by step: account details + profile in one call.
    await http().put("/api/teacher/profile").set(as("clerk_emma")).send({ country: "United States", phone: "+1 555 010 2030", gender: null, headline: "IELTS coach", bio: "Former examiner.", specialties: ["IELTS Prep"], teaches: ["adults"], yearsExperience: 6, priceCents: 4000, offersTrial: true, interviewPreference: "weekends" }).expect(200);
    await http().put("/api/teacher/profile").set(as("clerk_emma")).send({ introVideoUrl: "http://not-https.example" }).expect(400);
    const early = await http().post("/api/teacher/application/submit").set(as("clerk_emma")).expect(400);
    assert.match(early.body.message, /introduction video, identity verification/);
    await http().put("/api/teacher/profile").set(as("clerk_emma")).send({ introVideoUrl: "https://youtu.be/abc123" }).expect(200);

    // Identity: Stripe page, then the result read back (webhook or return page).
    const idv = await http().post("/api/teacher/identity/session").set(as("clerk_emma")).expect(201);
    assert.equal(idv.body.url, "https://verify.stripe.test/session");
    let own = await http().get("/api/teacher/profile").set(as("clerk_emma")).expect(200);
    assert.equal(own.body.identityStatus, "pending");
    assert.equal(own.body.country, "United States");
    assert.equal(own.body.interviewPreference, "weekends");
    assert.equal(own.body.stripeIdentitySessionId, undefined, "internal ids are not exposed");
    identityResult = "verified";
    const synced = await http().post("/api/teacher/identity/sync").set(as("clerk_emma")).expect(201);
    assert.equal(synced.body.identityStatus, "verified");
    await http().post("/api/teacher/identity/session").set(as("clerk_emma")).expect(400);

    // Submit → pending, visible to the admin with all details; not public yet.
    await http().post("/api/teacher/application/submit").set(as("clerk_emma")).expect(201);
    const pending = await http().get("/api/admin/teachers?status=pending").set(as("clerk_admin")).expect(200);
    const app = pending.body.find((t: { email: string }) => t.email === "emma@example.com");
    assert.equal(app.headline, "IELTS coach");
    assert.equal(app.introVideoUrl, "https://youtu.be/abc123");
    assert.ok(app.submittedAt);
    const hidden = await http().get("/api/teachers?limit=50").expect(200);
    assert.ok(!hidden.body.some((t: { slug: string }) => t.slug === app.slug));

    // Interview request, then approval with evaluation → public profile.
    await http().post(`/api/admin/teachers/${app.id}/interview`).set(as("clerk_admin")).send({ notes: "Saturday 10:00 ET?" }).expect(201);
    own = await http().get("/api/teacher/profile").set(as("clerk_emma")).expect(200);
    assert.ok(own.body.review.interviewRequestedAt);
    assert.equal(own.body.review.adminNotes, "Saturday 10:00 ET?");
    await http().post(`/api/admin/teachers/${app.id}/decision`).set(as("clerk_admin")).send({ decision: "approved", evaluation: { fluency: 5 }, notes: "Great" }).expect(201);
    me = await http().get("/api/me").set(as("clerk_emma")).expect(200);
    assert.equal(me.body.teacherStatus, "approved");
    const pub = await http().get(`/api/teachers/${app.slug}`).expect(200);
    assert.equal(pub.body.headline, "IELTS coach");

    // Webhook path for identity events is accepted too.
    const ev = await http().post("/api/webhooks/stripe").set("stripe-signature", "t").send({ id: "evt_idv", type: "identity.verification_session.verified", data: { object: { id: "vs_test_1", status: "verified", metadata: {} } } }).expect(200);
    assert.equal(ev.body.updated, 1);
  });
});
