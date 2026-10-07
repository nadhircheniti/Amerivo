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
