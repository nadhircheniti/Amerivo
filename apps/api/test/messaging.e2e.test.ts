/** Messaging + in-app notifications (conversations, pagination, unread counts, privacy). */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createTestApp } from "./harness";

type H = Awaited<ReturnType<typeof createTestApp>>;

describe("messaging", () => {
  let h: H;
  let student: { id: string };
  let other: { id: string };
  let teacher: { id: string };
  let teacher2: { id: string };
  let convId = "";

  before(async () => {
    h = await createTestApp();
    student = await h.seedStudent("clerk_ms1", { firstName: "Sam" });
    other = await h.seedStudent("clerk_ms2", { firstName: "Olga" });
    teacher = await h.seedTeacher("clerk_mt1", { firstName: "Tina" });
    teacher2 = await h.seedTeacher("clerk_mt2", { firstName: "Tom" });
    await h.seedTeacher("clerk_mt3", { status: "pending" });
    await h.seedAdmin("clerk_madmin");
    await h.seedBooking(student.id, teacher2.id);
  });
  after(() => h?.close());

  it("student starts a conversation with an approved teacher by slug (idempotent)", async () => {
    const r = await h.http().post("/api/conversations").set(h.as("clerk_ms1")).send({ teacherSlug: "clerk-mt1" }).expect(201);
    assert.equal(r.body.studentId, student.id);
    assert.equal(r.body.teacherId, teacher.id);
    convId = r.body.id;
    const again = await h.http().post("/api/conversations").set(h.as("clerk_ms1")).send({ teacherSlug: "clerk-mt1" }).expect(201);
    assert.equal(again.body.id, convId);
  });

  it("refuses unknown / unapproved teachers and bad bodies", async () => {
    await h.http().post("/api/conversations").set(h.as("clerk_ms1")).send({ teacherSlug: "nobody" }).expect(404);
    await h.http().post("/api/conversations").set(h.as("clerk_ms1")).send({ teacherSlug: "clerk-mt3" }).expect(404);
    await h.http().post("/api/conversations").set(h.as("clerk_ms1")).send({}).expect(400);
    await h.http().post("/api/conversations").set(h.as("clerk_ms1")).send({ teacherSlug: "clerk-mt1", extra: 1 }).expect(400);
  });

  it("teacher starts a conversation only with a student who booked them", async () => {
    await h.http().post("/api/conversations").set(h.as("clerk_mt2")).send({ studentId: other.id }).expect(403);
    const r = await h.http().post("/api/conversations").set(h.as("clerk_mt2")).send({ studentId: student.id }).expect(201);
    assert.equal(r.body.teacherId, teacher2.id);
    // Teacher 1 has no booking but the student already opened a conversation → allowed (returns it).
    const t1 = await h.http().post("/api/conversations").set(h.as("clerk_mt1")).send({ studentId: student.id }).expect(201);
    assert.equal(t1.body.id, convId);
  });

  it("admins have no access to conversations", async () => {
    await h.http().get("/api/conversations").set(h.as("clerk_madmin")).expect(403);
    await h.http().get(`/api/conversations/${convId}/messages`).set(h.as("clerk_madmin")).expect(403);
    await h.http().get("/api/messages/unread-count").set(h.as("clerk_madmin")).expect(403);
  });

  it("third parties can't read or write a conversation", async () => {
    await h.http().get(`/api/conversations/${convId}/messages`).set(h.as("clerk_ms2")).expect(403);
    await h.http().post(`/api/conversations/${convId}/messages`).set(h.as("clerk_mt2")).send({ body: "hi" }).expect(403);
    await h.http().get("/api/conversations/00000000-0000-0000-0000-000000000000/messages").set(h.as("clerk_ms1")).expect(404);
  });

  it("sends messages, validates the body, notifies the recipient", async () => {
    await h.http().post(`/api/conversations/${convId}/messages`).set(h.as("clerk_ms1")).send({ body: "   " }).expect(400);
    await h.http().post(`/api/conversations/${convId}/messages`).set(h.as("clerk_ms1")).send({ body: "x".repeat(4001) }).expect(400);
    for (let i = 0; i < 5; i++) {
      h.clock.set(`2026-10-01T10:0${i}:00Z`);
      const r = await h.http().post(`/api/conversations/${convId}/messages`).set(h.as("clerk_ms1")).send({ body: `Hello ${i}` }).expect(201);
      assert.equal(r.body.senderId, student.id);
      assert.equal(r.body.readAt, null);
    }
    const unread = await h.http().get("/api/messages/unread-count").set(h.as("clerk_mt1")).expect(200);
    assert.equal(unread.body.count, 5);
    // The latest unread message, for the "new message" alert: sender's first name + preview only.
    assert.equal(unread.body.latest.conversationId, convId);
    assert.equal(unread.body.latest.senderFirstName, "Sam");
    assert.equal(unread.body.latest.preview, "Hello 4");
    assert.equal(unread.body.latest.kind, "text");
    assert.equal(unread.body.latest.createdAt, "2026-10-01T10:04:00.000Z");
    assert.deepEqual(Object.keys(unread.body.latest).sort(), ["conversationId", "createdAt", "id", "kind", "preview", "senderFirstName"]);
    const mine = await h.http().get("/api/messages/unread-count").set(h.as("clerk_ms1")).expect(200);
    assert.deepEqual(mine.body, { count: 0, latest: null });

    const notes = await h.http().get("/api/notifications").set(h.as("clerk_mt1")).expect(200);
    assert.equal(notes.body.length, 5);
    assert.equal(notes.body[0].type, "message");
    assert.equal(notes.body[0].title, "New message from Sam");
    assert.equal(notes.body[0].body, "Hello 4");
  });

  it("lists conversations newest activity first with last message and unread count", async () => {
    h.clock.set("2026-10-01T11:00:00Z");
    const conv2 = (await h.http().post("/api/conversations").set(h.as("clerk_ms1")).send({ teacherSlug: "clerk-mt2" }).expect(201)).body.id;
    await h.http().post(`/api/conversations/${conv2}/messages`).set(h.as("clerk_mt2")).send({ body: "See you Wednesday" }).expect(201);

    const s = await h.http().get("/api/conversations").set(h.as("clerk_ms1")).expect(200);
    assert.equal(s.body.length, 2);
    assert.equal(s.body[0].id, conv2);
    assert.equal(s.body[0].other.firstName, "Tom");
    assert.equal(s.body[0].other.role, "teacher");
    assert.equal(s.body[0].other.teacherSlug, "clerk-mt2");
    assert.equal(s.body[0].lastMessage.body, "See you Wednesday");
    assert.equal(s.body[0].unreadCount, 1);
    assert.equal(s.body[1].id, convId);
    assert.equal(s.body[1].unreadCount, 0);
    assert.equal(s.body[1].lastMessage.body, "Hello 4");

    const t = await h.http().get("/api/conversations").set(h.as("clerk_mt1")).expect(200);
    assert.equal(t.body.length, 1);
    assert.equal(t.body[0].other.id, student.id);
    assert.equal(t.body[0].other.role, "student");
    assert.equal(t.body[0].unreadCount, 5);
    const o = await h.http().get("/api/conversations").set(h.as("clerk_ms2")).expect(200);
    assert.deepEqual(o.body, []);
  });

  it("paginates oldest→newest and marks the other side's messages read", async () => {
    const p1 = await h.http().get(`/api/conversations/${convId}/messages?limit=2`).set(h.as("clerk_mt1")).expect(200);
    assert.deepEqual(p1.body.items.map((m: { body: string }) => m.body), ["Hello 3", "Hello 4"]);
    assert.equal(p1.body.hasMore, true);
    assert.ok(p1.body.items.every((m: { readAt: string | null }) => m.readAt));
    const p2 = await h.http().get(`/api/conversations/${convId}/messages?limit=2&before=${encodeURIComponent(p1.body.items[0].createdAt)}`).set(h.as("clerk_mt1")).expect(200);
    assert.deepEqual(p2.body.items.map((m: { body: string }) => m.body), ["Hello 1", "Hello 2"]);
    assert.equal(p2.body.hasMore, true);
    const p3 = await h.http().get(`/api/conversations/${convId}/messages?limit=2&before=${encodeURIComponent(p2.body.items[0].createdAt)}`).set(h.as("clerk_mt1")).expect(200);
    assert.deepEqual(p3.body.items.map((m: { body: string }) => m.body), ["Hello 0"]);
    assert.equal(p3.body.hasMore, false);
    await h.http().get(`/api/conversations/${convId}/messages?before=nope`).set(h.as("clerk_mt1")).expect(400);

    const unread = await h.http().get("/api/messages/unread-count").set(h.as("clerk_mt1")).expect(200);
    assert.deepEqual(unread.body, { count: 0, latest: null });
    // Everything read → the "new message" notifications are marked read too.
    assert.equal((await h.http().get("/api/notifications/unread-count").set(h.as("clerk_mt1")).expect(200)).body.count, 0);
    // The sender reading their own thread doesn't mark anything.
    const s = await h.http().get(`/api/conversations/${convId}/messages`).set(h.as("clerk_ms1")).expect(200);
    assert.equal(s.body.items.length, 5);
  });

  it("lists and marks notifications as read (selected ids, then all)", async () => {
    for (let i = 0; i < 3; i++) {
      h.clock.set(`2026-10-01T12:0${i}:00Z`);
      await h.http().post(`/api/conversations/${convId}/messages`).set(h.as("clerk_ms1")).send({ body: `Again ${i}` }).expect(201);
    }
    const list = await h.http().get("/api/notifications?limit=2").set(h.as("clerk_mt1")).expect(200);
    assert.equal(list.body.length, 2);
    assert.equal((await h.http().get("/api/notifications/unread-count").set(h.as("clerk_mt1")).expect(200)).body.count, 3);
    assert.equal(list.body[0].body, "Again 2");

    // Someone else's ids are ignored.
    const foreign = await h.http().post("/api/notifications/read").set(h.as("clerk_ms2")).send({ ids: [list.body[0].id] }).expect(200);
    assert.equal(foreign.body.updated, 0);
    await h.http().post("/api/notifications/read").set(h.as("clerk_mt1")).send({ ids: ["not-a-uuid"] }).expect(400);

    const one = await h.http().post("/api/notifications/read").set(h.as("clerk_mt1")).send({ ids: [list.body[0].id] }).expect(200);
    assert.equal(one.body.updated, 1);
    const all = await h.http().post("/api/notifications/read").set(h.as("clerk_mt1")).send({}).expect(200);
    assert.equal(all.body.updated, 2);
    const after = await h.http().get("/api/notifications").set(h.as("clerk_mt1")).expect(200);
    assert.ok(after.body.every((n: { readAt: string | null }) => n.readAt));
    assert.equal((await h.http().get("/api/notifications/unread-count").set(h.as("clerk_mt1")).expect(200)).body.count, 0);
    // Admins have a notification inbox too.
    await h.http().get("/api/notifications").set(h.as("clerk_madmin")).expect(200);
  });
});
