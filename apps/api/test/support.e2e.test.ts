import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "./harness";

describe("contact form & support inbox", () => {
  let h: Awaited<ReturnType<typeof createTestApp>>;
  const sent: { to: string; subject: string; text: string; reply_to?: string }[] = [];
  const realFetch = globalThis.fetch;

  before(async () => {
    h = await createTestApp();
    await h.seedAdmin();
    await h.seedStudent("clerk_maria", { email: "Maria@Example.com", firstName: "Maria" });
    process.env.SUPPORT_EMAIL = "contact@amerivoenglish.com";
    process.env.EMAIL_FROM = "Amerivo English <contact@amerivoenglish.com>";
  });
  after(async () => {
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY;
    await h.close();
  });

  /** Captures Resend calls instead of sending e-mails. */
  const fakeResend = () => {
    process.env.RESEND_API_KEY = "re_test";
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      assert.equal(String(url), "https://api.resend.com/emails");
      sent.push(JSON.parse(String(init?.body)));
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
  };

  it("exposes the support address publicly", async () => {
    const r = await h.http().get("/api/contact").expect(200);
    assert.equal(r.body.email, "contact@amerivoenglish.com");
  });

  it("validates the form", async () => {
    await h.http().post("/api/contact").send({ name: "A", email: "nope", topic: "other", message: "short" }).expect(400);
  });

  it("stores a message without e-mail configured and notifies admins in-app", async () => {
    await h
      .http()
      .post("/api/contact")
      .send({ name: "Maria Silva", email: "maria@example.com", topic: "billing", message: "I was charged twice for my lesson.", locale: "pt" })
      .expect(201);
    const list = await h.http().get("/api/admin/support?status=open").set(h.as("clerk_admin")).expect(200);
    assert.equal(list.body.total, 1);
    const m = list.body.items[0];
    assert.equal(m.name, "Maria Silva");
    assert.equal(m.topic, "billing");
    assert.equal(m.hasAccount, true); // matched case-insensitively to the student account
    assert.equal(m.role, "student");
    assert.equal(m.replies, 0);
    const badges = await h.http().get("/api/admin/badges").set(h.as("clerk_admin")).expect(200);
    assert.equal(badges.body.openSupport, 1);
    const notes = await h.db.select().from(h.schema.notifications);
    assert.ok(notes.some((n) => n.type === "support.new"));
  });

  it("drops bot submissions (honeypot)", async () => {
    await h.http().post("/api/contact").send({ name: "Bot", email: "bot@spam.test", topic: "general", message: "Buy cheap followers now!!!", website: "http://spam" }).expect(201);
    const list = await h.http().get("/api/admin/support").set(h.as("clerk_admin")).expect(200);
    assert.equal(list.body.total, 1);
  });

  it("e-mails the support mailbox and the sender when Resend is configured", async () => {
    fakeResend();
    await h.http().post("/api/contact").send({ name: "Acme HR", email: "hr@acme.test", topic: "business", message: "We would like 20 sessions for our team." }).expect(201);
    const copy = sent.find((e) => e.to === "contact@amerivoenglish.com");
    assert.ok(copy, "support mailbox gets a copy");
    assert.equal(copy.reply_to, "hr@acme.test");
    const ack = sent.find((e) => e.to === "hr@acme.test");
    assert.ok(ack, "sender gets an acknowledgment");
    assert.equal(ack.reply_to, "contact@amerivoenglish.com");
  });

  it("admin replies: stored, e-mailed with Reply-To support, status answered", async () => {
    sent.length = 0;
    const list = await h.http().get("/api/admin/support?search=acme").set(h.as("clerk_admin")).expect(200);
    const id = list.body.items[0].id;
    const r = await h.http().post(`/api/admin/support/${id}/reply`).set(h.as("clerk_admin")).send({ body: "Thanks! Our team will send you a quote today." }).expect(201);
    assert.equal(r.body.emailed, true);
    assert.equal(sent[0].to, "hr@acme.test");
    assert.equal(sent[0].reply_to, "contact@amerivoenglish.com");
    assert.match(sent[0].text, /quote today/);
    const d = await h.http().get(`/api/admin/support/${id}`).set(h.as("clerk_admin")).expect(200);
    assert.equal(d.body.status, "answered");
    assert.equal(d.body.replies.length, 1);
    assert.equal(d.body.replies[0].author, "Ada Admin");
    assert.equal(d.body.emailEnabled, true);
    await h.http().post(`/api/admin/support/${id}/status`).set(h.as("clerk_admin")).send({ status: "closed" }).expect(201);
    const closed = await h.http().get("/api/admin/support?status=closed").set(h.as("clerk_admin")).expect(200);
    assert.equal(closed.body.total, 1);
  });

  it("is admin-only", async () => {
    await h.http().get("/api/admin/support").set(h.as("clerk_maria")).expect(403);
  });
});
