import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REDACTION, scanContactDetails } from "../src/domain/contact-guard";
import { videoEmbedUrl } from "../src/domain/video";

const types = (s: string) => scanContactDetails(s).findings.map((f) => f.type);
const clean = (s: string) => {
  const r = scanContactDetails(s);
  assert.deepEqual(r.findings, [], `unexpected finding in "${s}": ${JSON.stringify(r.findings)}`);
  assert.equal(r.text, s);
  assert.equal(r.redacted, false);
};

describe("contact guard — catches contact details", () => {
  it("plain e-mail addresses", () => {
    const r = scanContactDetails("Write to me: John.Doe+lessons@gmail.com thanks");
    assert.equal(r.text, `Write to me: ${REDACTION} thanks`);
    assert.deepEqual(types("John.Doe+lessons@gmail.com"), ["email"]);
  });

  it("obfuscated e-mail addresses", () => {
    for (const s of ["john (at) gmail (dot) com", "john at gmail dot com", "jean arobase hotmail point fr", "john [at] yahoo.com", "johnsmith gmail com"]) {
      const r = scanContactDetails(`mail me ${s} ok`);
      assert.ok(r.redacted, s);
      assert.ok(r.findings.some((f) => f.type === "email"), s);
    }
  });

  it("phone numbers in common formats", () => {
    for (const s of ["+1 (512) 555-0147", "512.555.0147", "06 12 34 56 78", "0041 79 123 45 67", "+33612345678", "(212) 555 0198"]) {
      const r = scanContactDetails(`call ${s} please`);
      assert.deepEqual(r.findings.map((f) => f.type), ["phone"], s);
      assert.equal(r.text, `call ${REDACTION} please`, s);
    }
  });

  it("full-width, Arabic-Indic digits and zero-width tricks", () => {
    assert.ok(scanContactDetails("رقمي ٠٦١٢٣٤٥٦٧٨").redacted);
    assert.ok(scanContactDetails("call ０６１２３４５６７８").redacted);
    const r = scanContactDetails("j​ohn@gm​ail.com");
    assert.equal(r.text, REDACTION);
  });

  it("spelled-out numbers", () => {
    assert.ok(scanContactDetails("my number is five one two five five five zero one four seven").redacted);
    assert.ok(scanContactDetails("zéro six douze? non: zéro six un deux trois quatre cinq six sept huit").redacted);
  });

  it("links, bare domains and app short links", () => {
    assert.deepEqual(types("see https://calendly.com/john"), ["link"]);
    assert.deepEqual(types("www.johnteaches.net"), ["link"]);
    assert.deepEqual(types("my site johnteaches.com/book"), ["link"]);
    assert.deepEqual(types("wa.me/15125550147"), ["link"]);
    assert.deepEqual(types("join t.me/johnenglish"), ["link"]);
  });

  it("social handles", () => {
    const r = scanContactDetails("follow @john_teaches_english");
    assert.equal(r.text, `follow ${REDACTION}`);
    assert.deepEqual(types("follow @john_teaches_english"), ["handle"]);
  });

  it("messaging apps are reported but not redacted", () => {
    const r = scanContactDetails("Do you have WhatsApp?");
    assert.equal(r.text, "Do you have WhatsApp?");
    assert.equal(r.redacted, false);
    assert.deepEqual(r.findings, [{ type: "app", match: "WhatsApp" }]);
    assert.deepEqual(types("добавь меня в телеграм"), ["app"]);
    assert.deepEqual(types("加我微信"), ["app"]);
    assert.deepEqual(types("let's continue on zoom"), ["app"]);
  });

  it("keeps the rest of the message intact, in any script", () => {
    const r = scanContactDetails("Bonjour 👋🏽 مرحبا 你好 — mail: a.b@c.io — à demain");
    assert.equal(r.text, `Bonjour 👋🏽 مرحبا 你好 — mail: ${REDACTION} — à demain`);
  });
});

describe("contact guard — no false positives on normal lesson talk", () => {
  it("times, prices, dates and counts", () => {
    clean("See you at 10:30 tomorrow, lesson 3 of 10.");
    clean("The package costs $315 instead of $350.");
    clean("My exam is on 2026-10-07 and the next one 12/11/2026.");
    clean("Read pages 45-52 and do exercises 1, 2, 3 and 4.");
    clean("I scored 7.5 in IELTS, and 98 points in TOEFL.");
    clean("Lesson from 14:00 to 14:50, 50 minutes.");
  });

  it("ordinary words, file names and the Amerivo domain", () => {
    clean("Please zoom in on the picture of the line.");
    clean("I sent the homework.pdf, check the notes.docx too");
    clean("Book more lessons on amerivoenglish.com");
    clean("e.g. I.e. etc. — Mr. Smith arrived at 9 a.m.");
    clean("Repeat after me: one two three four five six seven eight nine");
    clean("");
  });

  it("everyday sentences found by the code review", () => {
    clean("Do you live in Paris?");
    clean("Please mail me your homework before Friday.");
    clean("I help students who live in Brazil and Mexico.");
    clean("Look at this point in the text.");
    clean("I like it.It is good");
    clean("I agree.Me too");
    clean("The school year 2024-2025 starts in September.");
    clean("Read pages 12 13 14 15 tonight.");
    clean("Do exercises 1 2 3 4 5 6 7 8.");
    clean("See you @5pm!");
  });
});


describe("intro video links", () => {
  it("embeds YouTube, Vimeo, Loom and Google Drive links", () => {
    assert.equal(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    assert.equal(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=3"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    assert.equal(videoEmbedUrl("https://youtube.com/shorts/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    assert.equal(videoEmbedUrl("https://vimeo.com/76979871/abc123"), "https://player.vimeo.com/video/76979871?h=abc123");
    assert.equal(videoEmbedUrl("https://www.loom.com/share/0281766fa2d04bb788eaf19e65135184"), "https://www.loom.com/embed/0281766fa2d04bb788eaf19e65135184");
    assert.equal(videoEmbedUrl("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view?usp=sharing"), "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/preview");
  });
  it("refuses any other link (it would send visitors to an outside website)", () => {
    for (const s of ["https://my-site.com/me.mp4", "https://youtube.com/channel/UC123", "javascript:alert(1)", "https://drive.google.com/drive/folders/abc", "not a url", ""]) {
      assert.equal(videoEmbedUrl(s), null, s);
    }
  });
});
