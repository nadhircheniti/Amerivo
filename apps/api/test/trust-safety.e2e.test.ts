/**
 * Trust & safety (QA round 1): Terms of Service acceptance, contact details hidden in every
 * user-to-user text + admin moderation queue, live classroom chat through the API, teaching
 * documents reviewed by an admin, public teacher photo/video, classroom opening time.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { createTestApp } from "./harness";
import { TERMS_VERSION } from "../src/domain/terms";

const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(64, 3)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

describe("trust & safety", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  let teacher: { id: string };
  let student: { id: string };
  let bookingId: string;

  before(async () => {
    h = await createTestApp({ now: "2026-10-14T15:00:00Z" });
    teacher = await h.seedTeacher("clerk_ts_t", { slug: "ts-teacher" });
    student = await h.seedStudent("clerk_ts_s");
    await h.seedStudent("clerk_ts_other");
    await h.seedAdmin("clerk_ts_admin");
    bookingId = (await h.seedBooking(student.id, teacher.id)).id; // 2026-10-14 16:00 UTC
  });
  after(() => h?.close());

  const { http, as } = { http: () => h.http(), as: (c: string) => h.as(c) };

  describe("terms of service", () => {
    it("registration requires accepting the terms and records version, time and IP", async () => {
      const base = { role: "student", email: "new@example.com", firstName: "New", lastName: "User", timezone: "Europe/Zurich", birthDate: "1990-01-01" };
      const refused = await http().post("/api/me/register").set(as("clerk_ts_new")).send(base).expect(400);
      assert.match(JSON.stringify(refused.body.message), /Terms of Service/);
      await http().post("/api/me/register").set(as("clerk_ts_new")).send({ ...base, acceptTerms: false }).expect(400);
      await http().post("/api/me/register").set(as("clerk_ts_new")).set("x-forwarded-for", "203.0.113.7").send({ ...base, acceptTerms: true }).expect(201);
      const [u] = await h.db.select().from(h.schema.users).where(eq(h.schema.users.clerkId, "clerk_ts_new"));
      assert.equal(u.termsVersion, TERMS_VERSION);
      assert.ok(u.termsAcceptedAt);
      assert.equal(u.termsAcceptedIp, "203.0.113.7");
    });

    it("a user who refuses new Terms can still close their account", async () => {
      await h.seedStudent("clerk_ts_leaver", { termsVersion: "2020-01-01" });
      await http().get("/api/student/overview").set(as("clerk_ts_leaver")).expect(403);
      await http().delete("/api/me").set(as("clerk_ts_leaver")).expect(200);
    });

    it("blocks students and teachers who haven't accepted the current version (admins are exempt)", async () => {
      await h.seedStudent("clerk_ts_old", { termsVersion: "2020-01-01" });
      const blocked = await http().get("/api/student/overview").set(as("clerk_ts_old")).expect(403);
      assert.equal(blocked.body.error, "terms_required");
      // /me stays reachable so the web app can show the acceptance screen.
      const me = await http().get("/api/me").set(as("clerk_ts_old")).expect(200);
      assert.equal(me.body.termsVersion, "2020-01-01");
      await http().post("/api/me/terms").set(as("clerk_ts_old")).send({ version: "2020-01-01" }).expect(400);
      await http().post("/api/me/terms").set(as("clerk_ts_old")).send({ version: TERMS_VERSION }).expect(200);
      await http().get("/api/student/overview").set(as("clerk_ts_old")).expect(200);

      await h.db.update(h.schema.users).set({ termsVersion: null }).where(eq(h.schema.users.clerkId, "clerk_ts_admin"));
      await http().get("/api/admin/badges").set(as("clerk_ts_admin")).expect(200);
    });
  });

  describe("contact details in messages", () => {
    let conversationId: string;
    let flagId: string;

    it("hides contact details before storing, e-mailing or showing a message, and tells the sender", async () => {
      conversationId = (await http().post("/api/conversations").set(as("clerk_ts_s")).send({ teacherSlug: "ts-teacher" }).expect(201)).body.id;
      await http().post(`/api/conversations/${conversationId}/messages`).set(as("clerk_ts_s")).send({ body: "Hello, see you Wednesday" }).expect(201);
      h.clock.set("2026-10-14T15:00:30Z");
      const sent = await http()
        .post(`/api/conversations/${conversationId}/messages`)
        .set(as("clerk_ts_s"))
        .send({ body: "Text me on WhatsApp +1 (512) 555-0147 or maria.silva@gmail.com" })
        .expect(201);
      assert.equal(sent.body.body, "Text me on WhatsApp [hidden] or [hidden]");
      assert.deepEqual(sent.body.moderation, { redacted: true, types: ["app", "phone", "email"] });

      const seen = await http().get(`/api/conversations/${conversationId}/messages`).set(as("clerk_ts_t")).expect(200);
      assert.equal(seen.body.items.at(-1).body, "Text me on WhatsApp [hidden] or [hidden]");
      const notes = await h.db.select().from(h.schema.notifications).where(eq(h.schema.notifications.userId, teacher.id));
      assert.ok(notes.length > 0);
      for (const n of notes) assert.doesNotMatch(n.body ?? "", /555|gmail/, "the e-mail/in-app notification never carries the contact details");
    });

    it("reports it to the admins with the original text and the conversation around it", async () => {
      await http().get("/api/admin/moderation").set(as("clerk_ts_s")).expect(403);
      const list = await http().get("/api/admin/moderation?status=open").set(as("clerk_ts_admin")).expect(200);
      const flag = list.body.items.find((f: { context: string }) => f.context === "message");
      assert.ok(flag);
      flagId = flag.id;
      assert.match(flag.originalText, /555-0147/);
      assert.equal(flag.sender.id, student.id);
      assert.equal(flag.recipient.id, teacher.id);
      assert.equal(flag.senderFlags30d, 1);
      const ctx = await http().get(`/api/admin/moderation/${flagId}/context`).set(as("clerk_ts_admin")).expect(200);
      assert.equal(ctx.body.kind, "conversation");
      assert.deepEqual(
        ctx.body.messages.map((m: { body: string }) => m.body),
        ["Hello, see you Wednesday", "Text me on WhatsApp [hidden] or [hidden]"],
      );
      const badges = await http().get("/api/admin/badges").set(as("clerk_ts_admin")).expect(200);
      assert.ok(badges.body.openModeration >= 1);
    });

    it("warn notifies the sender; block disables the account", async () => {
      await http().post(`/api/admin/moderation/${flagId}/review`).set(as("clerk_ts_admin")).send({ action: "warn", note: "First warning" }).expect(200);
      const [warning] = await h.db
        .select()
        .from(h.schema.notifications)
        .where(and(eq(h.schema.notifications.userId, student.id), eq(h.schema.notifications.type, "policy_warning")));
      assert.match(warning.body ?? "", /section 8/);
      assert.match(warning.body ?? "", /First warning/);

      const victim = await h.seedStudent("clerk_ts_spam");
      const c = (await http().post("/api/conversations").set(as("clerk_ts_spam")).send({ teacherSlug: "ts-teacher" }).expect(201)).body.id;
      await http().post(`/api/conversations/${c}/messages`).set(as("clerk_ts_spam")).send({ body: "add me @spammer_99" }).expect(201);
      const list = await http().get("/api/admin/moderation?status=open").set(as("clerk_ts_admin")).expect(200);
      const flag = list.body.items.find((f: { sender: { id: string } }) => f.sender.id === victim.id);
      await http().post(`/api/admin/moderation/${flag.id}/review`).set(as("clerk_ts_admin")).send({ action: "block" }).expect(200);
      await http().get("/api/conversations").set(as("clerk_ts_spam")).expect(403);
      const audit = await h.db.select().from(h.schema.auditLogs).where(eq(h.schema.auditLogs.action, "moderation.block"));
      assert.equal(audit.length, 1);
    });
  });

  describe("lesson topic", () => {
    it("contact details in the topic of a booking are hidden from the teacher", async () => {
      const res = await http()
        .post("/api/bookings")
        .set(as("clerk_ts_s"))
        .send({ teacherSlug: "ts-teacher", offer: "single", startsAt: "2026-10-14T17:00:00.000Z", topic: "Job interview — call me 512-555-0147" })
        .expect(201);
      assert.equal(res.body.booking.topic, "Job interview — call me [hidden]");
      const [flag] = await h.db.select().from(h.schema.moderationFlags).where(eq(h.schema.moderationFlags.context, "booking"));
      assert.equal(flag.recipientId, teacher.id);
    });
  });

  describe("live classroom", () => {
    it("opens 5 minutes before the lesson, not earlier", async () => {
      h.clock.set("2026-10-14T15:54:59Z");
      await http().post(`/api/bookings/${bookingId}/join`).set(as("clerk_ts_s")).expect(400);
      await http().post(`/api/bookings/${bookingId}/chat`).set(as("clerk_ts_s")).send({ body: "hi" }).expect(400);
      h.clock.set("2026-10-14T15:55:00Z");
      await http().post(`/api/bookings/${bookingId}/join`).set(as("clerk_ts_t")).expect(201);
    });

    it("chat goes through the API, screened, and the other participant receives it by polling", async () => {
      const first = await http().post(`/api/bookings/${bookingId}/chat`).set(as("clerk_ts_t")).send({ body: "Welcome! Ready?" }).expect(201);
      h.clock.set("2026-10-14T16:01:00Z");
      const second = await http().post(`/api/bookings/${bookingId}/chat`).set(as("clerk_ts_s")).send({ body: "yes, my insta is @maria.silva" }).expect(201);
      assert.equal(second.body.body, "yes, my insta is [hidden]");
      assert.equal(second.body.moderation.redacted, true);

      const all = await http().get(`/api/bookings/${bookingId}/live`).set(as("clerk_ts_t")).expect(200);
      assert.deepEqual(
        all.body.messages.map((m: { body: string }) => m.body),
        ["Welcome! Ready?", "yes, my insta is [hidden]"],
      );
      // `after` is inclusive (two messages can share a millisecond); the page drops the ones it already has.
      const since = await http().get(`/api/bookings/${bookingId}/live?after=${encodeURIComponent(second.body.createdAt)}`).set(as("clerk_ts_t")).expect(200);
      assert.deepEqual(
        since.body.messages.map((m: { id: string }) => m.id),
        [second.body.id],
      );
      assert.ok(first.body.id);

      await http().get(`/api/bookings/${bookingId}/live`).set(as("clerk_ts_other")).expect(403);
      await http().post(`/api/bookings/${bookingId}/chat`).set(as("clerk_ts_admin")).send({ body: "hi" }).expect(403);
      await http().post(`/api/bookings/${bookingId}/chat`).set(as("clerk_ts_s")).send({ body: "x".repeat(2001) }).expect(400);
    });

    it("shared notes are screened, and repeated saves keep a single report", async () => {
      await http().put(`/api/bookings/${bookingId}/notes`).set(as("clerk_ts_t")).send({ notes: "Vocabulary: negotiate" }).expect(200);
      const r1 = await http().put(`/api/bookings/${bookingId}/notes`).set(as("clerk_ts_t")).send({ notes: "Vocabulary: negotiate. Call 512 555 0147" }).expect(200);
      assert.equal(r1.body[0].notes, "Vocabulary: negotiate. Call [hidden]");
      await http().put(`/api/bookings/${bookingId}/notes`).set(as("clerk_ts_t")).send({ notes: "Vocabulary: negotiate. Call 512 555 0147 or john@x.io" }).expect(200);
      const live = await http().get(`/api/bookings/${bookingId}/live`).set(as("clerk_ts_s")).expect(200);
      assert.equal(live.body.notes, "Vocabulary: negotiate. Call [hidden] or [hidden]");
      const flags = await h.db
        .select()
        .from(h.schema.moderationFlags)
        .where(and(eq(h.schema.moderationFlags.context, "lesson_notes"), eq(h.schema.moderationFlags.userId, teacher.id)));
      assert.equal(flags.length, 1);
      assert.deepEqual([...flags[0].types].sort(), ["email", "phone"]);
    });

    it("the lesson report and the public review are screened too", async () => {
      h.clock.set("2026-10-14T16:50:00Z");
      await http().post(`/api/bookings/${bookingId}/complete`).set(as("clerk_ts_t")).send({ attendance: "attended" }).expect(201);
      await http()
        .put(`/api/bookings/${bookingId}/report`)
        .set(as("clerk_ts_t"))
        .send({ topicsCovered: "Meetings", homework: "Send it to john.teacher@gmail.com", recommendation: "Book me on johnteaches.com" })
        .expect(200);
      const report = await http().get(`/api/bookings/${bookingId}/report`).set(as("clerk_ts_s")).expect(200);
      assert.equal(report.body.homework, "Send it to [hidden]");
      assert.equal(report.body.recommendation, "Book me on [hidden]");
      await http().post(`/api/bookings/${bookingId}/review`).set(as("clerk_ts_s")).send({ rating: 5, comment: "Great! Call me 06 12 34 56 78" }).expect(201);
      const reviews = await http().get("/api/teachers/ts-teacher/reviews").expect(200);
      assert.equal(reviews.body[0].comment, "Great! Call me [hidden]");
    });
  });

  describe("public teacher profile", () => {
    it("refuses contact details and non-embeddable video links; publishes photo and video", async () => {
      const bad = await http().put("/api/teacher/profile").set(as("clerk_ts_t")).send({ bio: "Email me at john@teach.com" }).expect(400);
      assert.match(bad.body.message, /section 8/);
      await http().put("/api/teacher/profile").set(as("clerk_ts_t")).send({ introVideoUrl: "https://my-own-site.com/video.mp4" }).expect(400);
      await http().put("/api/teacher/profile").set(as("clerk_ts_t")).send({ bio: "Ten years teaching adults.", introVideoUrl: "https://youtu.be/dQw4w9WgXcQ" }).expect(200);
      await http().post("/api/files").set(as("clerk_ts_t")).field("purpose", "avatar").attach("file", PNG, { filename: "me.png", contentType: "image/png" }).expect(201);

      const pub = await http().get("/api/teachers/ts-teacher").expect(200);
      assert.equal(pub.body.introVideoEmbedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
      assert.match(pub.body.avatarUrl, /^\/api\/files\//);
    });

    it("home page order: complete profiles first", async () => {
      await h.seedTeacher("clerk_ts_plain", { slug: "plain-teacher", ratingAvg: 500, ratingCount: 40 });
      const list = await http().get("/api/teachers?sort=featured").expect(200);
      assert.equal(list.body[0].slug, "ts-teacher", "photo + video beat a better rating without them");
    });

    it("a blocked teacher disappears from the direct link too", async () => {
      await h.db.update(h.schema.users).set({ status: "blocked" }).where(eq(h.schema.users.clerkId, "clerk_ts_plain"));
      await http().get("/api/teachers/plain-teacher").expect(404);
    });
  });

  describe("report button", () => {
    it("a student reports the teacher of their lesson; admins see who, why and the classroom chat", async () => {
      const body = { reportedUserId: teacher.id, reason: "inappropriate", details: "Asked me to pay him directly on PayPal.", bookingId };
      await http().post("/api/reports").set(as("clerk_ts_s")).send({ ...body, reason: "bad" }).expect(400);
      await http().post("/api/reports").set(as("clerk_ts_s")).send({ ...body, details: "short" }).expect(400);
      await http().post("/api/reports").set(as("clerk_ts_s")).send({ ...body, reportedUserId: student.id }).expect(400);
      await http().post("/api/reports").set(as("clerk_ts_other")).send(body).expect(403); // not their lesson
      await http().post("/api/reports").set(as("clerk_ts_admin")).send(body).expect(403); // students and teachers only
      const { body: created } = await http().post("/api/reports").set(as("clerk_ts_s")).send(body).expect(201);

      const list = await http().get("/api/admin/moderation?status=open").set(as("clerk_ts_admin")).expect(200);
      const r = list.body.items.find((f: { id: string }) => f.id === created.id);
      assert.equal(r.context, "report");
      assert.equal(r.reason, "inappropriate");
      assert.equal(r.sender.id, teacher.id, "the reported user");
      assert.equal(r.reporter.id, student.id);
      assert.match(r.originalText, /PayPal/);
      const ctx = await http().get(`/api/admin/moderation/${created.id}/context`).set(as("clerk_ts_admin")).expect(200);
      assert.equal(ctx.body.kind, "lesson_chat");
      assert.ok(ctx.body.messages.length >= 1);
    });

    it("a teacher can report a student from their conversation", async () => {
      const [c] = await h.db.select().from(h.schema.conversations).where(eq(h.schema.conversations.studentId, student.id));
      await http().post("/api/reports").set(as("clerk_ts_t")).send({ reportedUserId: student.id, reason: "harassment", details: "Insulting messages after the lesson.", conversationId: c.id }).expect(201);
      await http().post("/api/reports").set(as("clerk_ts_t")).send({ reportedUserId: student.id, reason: "harassment", details: "Insulting messages after the lesson." }).expect(400);
    });
  });

  describe("teaching documents", () => {
    let materialId: string;
    let fileUrl: string;
    const uploadDoc = (clerkId: string, title: string, file = PDF, description?: string) => {
      let r = h.http().post("/api/teacher/materials").set(h.as(clerkId)).field("title", title);
      if (description) r = r.field("description", description);
      return r.attach("file", file, { filename: "worksheet.pdf", contentType: "application/pdf" });
    };

    it("a teacher uploads a document: it waits for an admin", async () => {
      await uploadDoc("clerk_ts_t", "Worksheet", PNG.subarray(0, 4)).expect(400); // not a real PDF/PNG
      const bad = await uploadDoc("clerk_ts_t", "Worksheet — WhatsApp +1 512 555 0147").expect(400);
      assert.match(bad.body.message, /not allowed/);
      const created = await uploadDoc("clerk_ts_t", "Business emails worksheet", PDF, "Phrases for formal e-mails").expect(201);
      materialId = created.body.id;
      fileUrl = created.body.fileUrl;
      assert.equal(created.body.status, "pending");

      const pendingTeacher = await h.seedTeacher("clerk_ts_pending", { slug: "pending-t", status: "pending" });
      assert.ok(pendingTeacher);
      await uploadDoc("clerk_ts_pending", "Doc").expect(403);
    });

    it("students don't see it before approval", async () => {
      const list = await http().get("/api/student/materials").set(as("clerk_ts_s")).expect(200);
      assert.deepEqual(list.body, []);
      await http().get(fileUrl).set(as("clerk_ts_s")).expect(403);
    });

    it("admin rejects with a reason or approves; then the teacher's students can download it", async () => {
      await http().post(`/api/admin/materials/${materialId}/review`).set(as("clerk_ts_s")).send({ decision: "approved" }).expect(403);
      await http().post(`/api/admin/materials/${materialId}/review`).set(as("clerk_ts_admin")).send({ decision: "rejected" }).expect(400);
      const queue = await http().get("/api/admin/materials?status=pending").set(as("clerk_ts_admin")).expect(200);
      assert.equal(queue.body.items[0].id, materialId);
      await http().get(fileUrl).set(as("clerk_ts_admin")).expect(200); // admin can open it to check
      await http().post(`/api/admin/materials/${materialId}/review`).set(as("clerk_ts_admin")).send({ decision: "approved" }).expect(200);

      const list = await http().get("/api/student/materials").set(as("clerk_ts_s")).expect(200);
      assert.equal(list.body.length, 1);
      assert.equal(list.body[0].title, "Business emails worksheet");
      assert.equal(list.body[0].reviewNote, undefined);
      await http().get(fileUrl).set(as("clerk_ts_s")).expect(200);
      // A student without lessons with this teacher can't.
      await http().get(fileUrl).set(as("clerk_ts_other")).expect(403);
      assert.deepEqual((await http().get("/api/student/materials").set(as("clerk_ts_other")).expect(200)).body, []);
      // Teaching documents never appear in the generic file list.
      const files = await http().get("/api/files").set(as("clerk_ts_t")).expect(200);
      assert.ok(files.body.every((f: { purpose: string }) => f.purpose !== "material"));
    });

    it("needs the current Terms, and stops when the teacher is blocked", async () => {
      await h.db.update(h.schema.users).set({ termsVersion: "2020-01-01" }).where(eq(h.schema.users.id, student.id));
      await http().get(fileUrl).set(as("clerk_ts_s")).expect(403);
      await h.db.update(h.schema.users).set({ termsVersion: TERMS_VERSION }).where(eq(h.schema.users.id, student.id));
      await http().get(fileUrl).set(as("clerk_ts_s")).expect(200);

      await h.db.update(h.schema.users).set({ status: "blocked" }).where(eq(h.schema.users.id, teacher.id));
      await http().get(fileUrl).set(as("clerk_ts_s")).expect(403);
      assert.deepEqual((await http().get("/api/student/materials").set(as("clerk_ts_s")).expect(200)).body, []);
      await h.db.update(h.schema.users).set({ status: "active" }).where(eq(h.schema.users.id, teacher.id));
    });

    it("the teacher can delete it", async () => {
      await http().delete(`/api/teacher/materials/${materialId}`).set(as("clerk_ts_pending")).expect(403);
      await http().delete(`/api/teacher/materials/${materialId}`).set(as("clerk_ts_t")).expect(200);
      await http().get(fileUrl).set(as("clerk_ts_s")).expect(404);
    });
  });
});
