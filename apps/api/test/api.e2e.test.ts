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
const fakeStripe = {
  createPaymentIntent: async (p: { amountCents: number }) => ({ id: `pi_${++stripeCalls.intents}`, client_secret: `secret_${stripeCalls.intents}`, amount: p.amountCents }),
  refund: async (pi: string, amount: number) => { stripeCalls.refunds.push({ pi, amount }); return { id: `re_${stripeCalls.refunds.length}` }; },
  transferToTeacher: async (p: { accountId: string; amountCents: number }) => { stripeCalls.transfers.push({ account: p.accountId, amount: p.amountCents }); return { id: `tr_${stripeCalls.transfers.length}` }; },
  constructEvent: (raw: Buffer) => JSON.parse(raw.toString()),
  identitySession: async () => ({ url: "https://verify.stripe.test/session" }),
};
const fakeDaily = {
  createRoom: async (p: { name: string }) => ({ name: p.name, url: `https://amerivo.daily.co/${p.name}` }),
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
    userId: sarah.id, slug: "sarah-mitchell", status: "approved", timezone: "America/Chicago", priceCents: 3500, offersPack5: true, offersPack10: true,
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
    const res = await http().post("/api/me/register").set(as("clerk_maria")).send({ role: "student", email: "maria@example.com", firstName: "Maria", lastName: "Silva", country: "Brazil", timezone: "Europe/Zurich" }).expect(201);
    ids.maria = res.body.id;
    assert.equal(res.body.status, "active");
    await http().post("/api/me/register").set(as("clerk_maria")).send({ role: "student", email: "maria@example.com", firstName: "Maria", lastName: "Silva", timezone: "Europe/Zurich" }).expect(409);
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
    assert.equal(upcoming.body.find((b: { id: string }) => b.id === singleId).status, "confirmed");
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

  it("admin analytics", async () => {
    const a = await http().get("/api/admin/analytics?days=60").set(as("clerk_admin")).expect(200);
    assert.equal(a.body.totalTeachers, 1);
    assert.equal(a.body.lessonsCompleted, 1);
    assert.ok(a.body.revenueCents >= 3500 + 16625);
    assert.equal(a.body.commissionCents, 700);
  });
});
