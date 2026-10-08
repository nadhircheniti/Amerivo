/**
 * Pure helpers of the web app, run with Node's built-in TypeScript support:
 *   npm test -w web   (node --experimental-strip-types --test test/)
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatClock, lessonClock } from "../src/app/classroom/[lessonId]/_components/lesson-clock.ts";
import { videoEmbedUrl } from "../src/lib/video.ts";
import { safePath } from "../src/lib/safe-path.ts";

const start = Date.parse("2026-10-14T16:00:00Z");

describe("classroom timer (QA: stayed at 00:00)", () => {
  it("counts down before the start instead of showing 00:00", () => {
    assert.deepEqual(lessonClock(start, 50, start - 4 * 60_000 - 5_000), { phase: "before", secondsToStart: 245 });
  });
  it("counts the minutes taught and the time left during the lesson", () => {
    assert.deepEqual(lessonClock(start, 50, start), { phase: "during", elapsed: 0, remaining: 3000, total: 3000 });
    assert.deepEqual(lessonClock(start, 50, start + 12 * 60_000 + 30_000), { phase: "during", elapsed: 750, remaining: 2250, total: 3000 });
  });
  it("shows overtime after the planned end", () => {
    assert.deepEqual(lessonClock(start, 50, start + 51 * 60_000), { phase: "overtime", elapsed: 3060, total: 3000 });
  });
  it("formats mm:ss and h:mm:ss", () => {
    assert.equal(formatClock(0), "00:00");
    assert.equal(formatClock(75), "01:15");
    assert.equal(formatClock(3725), "1:02:05");
    assert.equal(formatClock(-3), "00:00");
  });
});

describe("intro video links (same rule as the API)", () => {
  it("embeds YouTube, Vimeo, Loom and Google Drive; refuses other links", () => {
    assert.equal(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    assert.equal(videoEmbedUrl("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
    assert.equal(videoEmbedUrl("https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184"), "https://www.loom.com/embed/0281766fa2d04bb788eaf19e65135184");
    assert.equal(videoEmbedUrl("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view"), "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/preview");
    assert.equal(videoEmbedUrl("https://my-site.com/video"), null);
  });
});

describe("redirect after accepting the Terms (?next=)", () => {
  const o = "https://amerivoenglish.com";
  it("keeps paths on the site", () => {
    assert.equal(safePath("/student/lessons?tab=past#x", o), "/student/lessons?tab=past#x");
  });
  it("refuses other origins and loops", () => {
    for (const p of ["//evil.example", "/\\evil.example", "https://evil.example", "/\t/evil.example", "/accept-terms?next=/x", "", null]) {
      assert.equal(safePath(p, o), "/welcome", String(p));
    }
  });
});

describe("new-message alerts", async () => {
  const { nextAlert, parseUnreadSummary, conversationHref } = await import("../src/components/messaging/message-alert-logic.ts");
  const conv = "8d2f3c1e-5b6a-4c7d-9e8f-0a1b2c3d4e5f";
  const msg = (id: string, createdAt: string) => ({ id, conversationId: conv, kind: "text" as const, senderFirstName: "Sam", preview: "Hi", createdAt });

  it("doesn't announce messages that were already waiting when the page opened", () => {
    const first = nextAlert(null, { count: 2, latest: msg("a", "2026-10-07T10:00:00.000Z") }, false);
    assert.equal(first.announce, null);
    assert.equal(first.watermark, "2026-10-07T10:00:00.000Z");
    assert.deepEqual(nextAlert(null, { count: 0, latest: null }, false), { announce: null, watermark: "" });
  });

  it("announces a newer message once", () => {
    const b = msg("b", "2026-10-07T10:05:00.000Z");
    const r = nextAlert("2026-10-07T10:00:00.000Z", { count: 3, latest: b }, false);
    assert.equal(r.announce, b);
    assert.equal(nextAlert(r.watermark, { count: 3, latest: b }, false).announce, null, "same message on the next poll");
    assert.equal(nextAlert("", { count: 1, latest: b }, false).announce, b, "first message after an empty inbox");
  });

  it("doesn't announce an older unread message revealed after reading the newest one", () => {
    const r = nextAlert("2026-10-07T10:05:00.000Z", { count: 1, latest: msg("a", "2026-10-07T10:00:00.000Z") }, false);
    assert.deepEqual(r, { announce: null, watermark: "2026-10-07T10:05:00.000Z" });
  });

  it("stays quiet on the messages screen but remembers the message", () => {
    const r = nextAlert("2026-10-07T10:00:00.000Z", { count: 1, latest: msg("c", "2026-10-07T10:09:00.000Z") }, true);
    assert.deepEqual(r, { announce: null, watermark: "2026-10-07T10:09:00.000Z" });
  });

  it("only trusts a well-formed API answer", () => {
    assert.equal(parseUnreadSummary(null), null);
    assert.equal(parseUnreadSummary({ count: "3" }), null);
    assert.equal(parseUnreadSummary({ count: -1, latest: null }), null);
    assert.deepEqual(parseUnreadSummary({ count: 0, latest: null }), { count: 0, latest: null });
    assert.deepEqual(parseUnreadSummary({ count: 4 }), { count: 4, latest: null }, "older API without `latest`");
    assert.equal(parseUnreadSummary({ count: 1, latest: { id: "x", conversationId: conv, createdAt: "not a date" } }), null);
    const ok = parseUnreadSummary({ count: 1, latest: { ...msg("d", "2026-10-07T10:00:00.000Z"), kind: "weird", preview: "p".repeat(500) } });
    assert.equal(ok?.latest?.kind, "text");
    assert.equal(ok?.latest?.preview.length, 240);
  });

  it("links to the conversation, never to an arbitrary path", () => {
    assert.equal(conversationHref("student", conv), `/student/messages?c=${conv}`);
    assert.equal(conversationHref("teacher", "../../admin"), "/teacher/messages");
    assert.equal(conversationHref("teacher", "x&redirect=https://evil.test"), "/teacher/messages");
  });
});

describe("time zones (QA: 20:00 in Zurich shown at 15:00 for a US teacher)", async () => {
  const { zoneAbbrev, zoneCity, timeIn, sameClock, isValidTimeZone } = await import("../src/lib/time-zone.ts");
  // 20:00 in Zurich on three dates around the clock changes (Europe: Oct 25, US: Nov 1, 2026).
  const oct14 = "2026-10-14T18:00:00Z"; // Zurich UTC+2, Indiana UTC-4
  const oct29 = "2026-10-29T19:00:00Z"; // Zurich UTC+1, Indiana still UTC-4
  const nov2 = "2026-11-02T19:00:00Z"; // Zurich UTC+1, Indiana UTC-5

  it("converts with the rules of the lesson's date, not today's", () => {
    assert.equal(timeIn(oct14, "Europe/Zurich"), "20:00");
    assert.equal(timeIn(oct14, "America/Indiana/Indianapolis"), "14:00");
    assert.equal(timeIn(oct29, "Europe/Zurich"), "20:00");
    assert.equal(timeIn(oct29, "America/Indiana/Indianapolis"), "15:00", "only a 5-hour gap that week");
    assert.equal(timeIn(nov2, "America/Indiana/Indianapolis"), "14:00");
  });

  it("names the zone as it is on that date", () => {
    assert.equal(zoneAbbrev("America/New_York", oct29), "EDT");
    assert.equal(zoneAbbrev("America/New_York", nov2), "EST");
    assert.equal(zoneAbbrev("Europe/Zurich", oct14), "GMT+2");
    assert.equal(zoneAbbrev("Europe/Zurich", oct29), "GMT+1");
    assert.equal(zoneAbbrev("Not/AZone", oct29), "Not/AZone");
  });

  it("helpers", () => {
    assert.equal(zoneCity("America/Indiana/Indianapolis"), "Indianapolis");
    assert.equal(zoneCity("America/New_York"), "New York");
    assert.equal(sameClock(oct14, "America/New_York", "America/Indiana/Indianapolis"), true);
    assert.equal(sameClock(oct14, "America/New_York", "Europe/Zurich"), false);
    assert.equal(isValidTimeZone("Europe/Zurich"), true);
    assert.equal(isValidTimeZone("Mars/Base"), false);
    assert.equal(isValidTimeZone(null), false);
  });
});

describe("classroom phases (client: lessons end at minute 50, warning 5 minutes before)", async () => {
  const { classroomPhase } = await import("../src/app/classroom/[lessonId]/_components/lesson-clock.ts");
  const s = Date.parse("2026-10-14T16:00:00Z");
  const min = 60_000;
  it("before, during, ending soon in the last 5 minutes, closed at minute 50", () => {
    assert.equal(classroomPhase(s - min, s, 50), "before");
    assert.equal(classroomPhase(s, s, 50), "during");
    assert.equal(classroomPhase(s + 44 * min + 59_000, s, 50), "during");
    assert.equal(classroomPhase(s + 45 * min, s, 50), "endingSoon");
    assert.equal(classroomPhase(s + 50 * min - 1, s, 50), "endingSoon");
    assert.equal(classroomPhase(s + 50 * min, s, 50), "closed");
    assert.equal(classroomPhase(s + 19 * min, s, 20), "endingSoon", "20-minute trial");
  });
});

describe("sign-in from a new device (QA: Firefox stuck on 'Additional verification is required')", async () => {
  const { passwordSignIn, verifySecondFactor, SignInIncompleteError } = await import("../src/lib/sign-in-steps.ts");
  type Res = { status: string | null; createdSessionId: string | null; supportedSecondFactors: { strategy: string; emailAddressId?: string; safeIdentifier?: string }[] | null };
  const fake = (first: Res, after?: Res) => {
    const calls: { prepare: unknown[]; attempt: unknown[] } = { prepare: [], attempt: [] };
    const signIn = {
      ...first,
      calls,
      async create() {
        return { ...signIn, ...first };
      },
      async prepareSecondFactor(p: unknown) {
        calls.prepare.push(p);
        return signIn;
      },
      async attemptSecondFactor(p: unknown) {
        calls.attempt.push(p);
        return { ...signIn, ...(after ?? first) };
      },
    };
    return signIn;
  };
  const trusted: Res = { status: "complete", createdSessionId: "sess_1", supportedSecondFactors: null };
  const newDevice: Res = { status: "needs_client_trust", createdSessionId: null, supportedSecondFactors: [{ strategy: "email_code", emailAddressId: "idn_1", safeIdentifier: "m***@gmail.com" }] };

  it("known browser: signed in at once, nothing sent", async () => {
    const s = fake(trusted);
    assert.deepEqual(await passwordSignIn(s, "maria@gmail.com", "pw"), { sessionId: "sess_1" });
    assert.equal(s.calls.prepare.length, 0);
  });

  it("new browser: the e-mail code is actually sent, then the code completes the sign-in", async () => {
    const s = fake(newDevice, trusted);
    assert.deepEqual(await passwordSignIn(s, "maria@gmail.com", "pw"), { step: { strategy: "email_code", destination: "m***@gmail.com" } });
    assert.deepEqual(s.calls.prepare, [{ strategy: "email_code", emailAddressId: "idn_1" }]);
    assert.equal(await verifySecondFactor(s, { strategy: "email_code", destination: null }, "123456"), "sess_1");
    assert.deepEqual(s.calls.attempt, [{ strategy: "email_code", code: "123456" }]);
  });

  it("two-step verification with an app: nothing to send; a wrong code doesn't sign in", async () => {
    const s = fake({ status: "needs_second_factor", createdSessionId: null, supportedSecondFactors: [{ strategy: "totp" }] });
    assert.deepEqual(await passwordSignIn(s, "a@b.c", "pw"), { step: { strategy: "totp", destination: null } });
    assert.equal(s.calls.prepare.length, 0);
    await assert.rejects(verifySecondFactor(s, { strategy: "totp", destination: null }, "000000"), SignInIncompleteError);
  });

  it("any other status is reported, never treated as signed in", async () => {
    await assert.rejects(passwordSignIn(fake({ status: "needs_protect_check", createdSessionId: null, supportedSecondFactors: null }), "a@b.c", "pw"), SignInIncompleteError);
  });
});
