/**
 * Reusable test setup: real NestJS app + in-memory PostgreSQL (PGlite) with the production
 * migrations; Stripe and Daily.co replaced by fakes. One harness per test file.
 *
 *   const h = await createTestApp();
 *   const teacher = await h.seedTeacher("clerk_t1", { slug: "t-one" });
 *   await h.http().get("/api/me").set(h.as("clerk_t1")).expect(200);
 *   after(() => h.close());
 */
import "reflect-metadata";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
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

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function createTestApp(opts: { stripe?: Record<string, unknown>; daily?: Record<string, unknown>; now?: string } = {}) {
  const clock = { t: new Date(opts.now ?? "2026-10-01T00:00:00Z"), now() { return this.t; }, set(iso: string) { this.t = new Date(iso); } };
  const stripeCalls = { intents: 0, refunds: [] as { pi: string; amount: number }[], transfers: [] as { account: string; amount: number }[] };
  const intentStatus: Record<string, string> = {};
  const fakeStripe = {
    isConfigured: () => true,
    createPaymentIntent: async (p: { amountCents: number }) => ({ id: `pi_${++stripeCalls.intents}`, client_secret: `secret_${stripeCalls.intents}`, amount: p.amountCents }),
    retrieveIntent: async (id: string) => ({ id, status: intentStatus[id] ?? "requires_payment_method", client_secret: `secret_${id.slice(3)}` }),
    cancelIntent: async (id: string) => ({ id, status: "canceled" }),
    refund: async (pi: string, amount: number) => {
      stripeCalls.refunds.push({ pi, amount });
      return { id: `re_${stripeCalls.refunds.length}` };
    },
    transferToTeacher: async (p: { accountId: string; amountCents: number }) => {
      stripeCalls.transfers.push({ account: p.accountId, amount: p.amountCents });
      return { id: `tr_${stripeCalls.transfers.length}` };
    },
    constructEvent: (raw: Buffer) => JSON.parse(raw.toString()),
    identitySession: async () => ({ id: "vs_test_1", url: "https://verify.stripe.test/session" }),
    retrieveIdentitySession: async (id: string) => ({ id, status: "verified", last_error: null }),
    onboardingLink: async (p: { accountId?: string | null }) => ({ accountId: p.accountId ?? "acct_test_new", url: "https://connect.stripe.test/onboarding" }),
    ...opts.stripe,
  };
  const fakeDaily = {
    createRoom: async (p: { name: string }) => ({ name: p.name, url: `https://amerivo.daily.co/${p.name}` }),
    roomUrl: async (name: string) => `https://amerivo.daily.co/${name}`,
    meetingToken: async (p: { isOwner: boolean }) => ({ token: p.isOwner ? "owner-token" : "guest-token" }),
    ...opts.daily,
  };

  const pg = new PGlite();
  const db = drizzle(pg as never, { schema }) as TestDb; // cast: drizzle bundles its own PGlite typings
  await migrate(db, { migrationsFolder: "drizzle" });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB)
    .useValue(db)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(StripeService)
    .useValue(fakeStripe)
    .overrideProvider(DailyService)
    .useValue(fakeDaily)
    .compile();
  const app: INestApplication = moduleRef.createNestApplication({ rawBody: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();

  const http = () => request(app.getHttpServer());
  const as = (clerkId: string) => ({ "x-dev-user": clerkId });

  /** Active admin. */
  async function seedAdmin(clerkId = "clerk_admin") {
    const [u] = await db.insert(schema.users).values({ clerkId, role: "admin", status: "active", email: `${clerkId}@amerivo.test`, firstName: "Ada", lastName: "Admin" }).returning();
    return u;
  }
  /** Active student with a student profile. */
  async function seedStudent(clerkId: string, p: Partial<typeof schema.users.$inferInsert> = {}) {
    const [u] = await db
      .insert(schema.users)
      .values({ clerkId, role: "student", status: "active", email: `${clerkId}@example.com`, firstName: "Stu", lastName: "Dent", timezone: "Europe/Zurich", ...p })
      .returning();
    await db.insert(schema.studentProfiles).values({ userId: u.id });
    return u;
  }
  /** Approved teacher, available Wednesdays 11:00–13:00 in Chicago (= 16:00/17:00 UTC in October). */
  async function seedTeacher(clerkId: string, p: Partial<typeof schema.teacherProfiles.$inferInsert> & { firstName?: string } = {}) {
    const { firstName = "Tea", ...profile } = p;
    const [u] = await db
      .insert(schema.users)
      .values({ clerkId, role: "teacher", status: "active", email: `${clerkId}@amerivo.test`, firstName, lastName: "Cher", timezone: "America/Chicago" })
      .returning();
    await db.insert(schema.teacherProfiles).values({
      userId: u.id,
      slug: clerkId.replace(/_/g, "-"),
      status: "approved",
      timezone: "America/Chicago",
      priceCents: 3500,
      specialties: ["Conversation"],
      teaches: ["adults"],
      identityStatus: "verified",
      stripeAccountId: `acct_${clerkId}`,
      bio: "Bio",
      headline: "Headline",
      ...profile,
    });
    await db.insert(schema.availabilityRules).values([{ teacherId: u.id, weekday: 3, startMinute: 660, endMinute: 780 }]);
    return u;
  }
  /**
   * Confirmed single lesson (bypasses payment). Default: Wednesday 2026-10-14 16:00 UTC, 50 min, $35.
   * Returns the booking row.
   */
  async function seedBooking(studentId: string, teacherId: string, p: Partial<typeof schema.bookings.$inferInsert> = {}) {
    const [b] = await db
      .insert(schema.bookings)
      .values({ studentId, teacherId, type: "single", startsAt: new Date("2026-10-14T16:00:00Z"), durationMin: 50, priceCents: 3500, status: "confirmed", createdAt: clock.now(), ...p })
      .returning();
    await db.insert(schema.payments).values({ studentId, bookingId: b.id, amountCents: b.priceCents, status: "succeeded", providerRef: `pi_seed_${b.id.slice(0, 8)}` });
    return b;
  }

  return {
    app,
    db,
    schema,
    clock,
    http,
    as,
    stripeCalls,
    intentStatus,
    seedAdmin,
    seedStudent,
    seedTeacher,
    seedBooking,
    close: async () => {
      await app.close();
      await pg.close();
    },
  };
}
