import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quote, perLessonValue, PricingError } from "../src/domain/pricing";
import { decideCancellation, canAdminRefundAfterLesson, teacherShouldBeWarned } from "../src/domain/cancellation";
import { splitEarning, nextMonthlyPayoutDate, balances } from "../src/domain/earnings";
import { generateSlots, isSlotAvailable, type SlotQuery } from "../src/domain/availability";
import { recommend } from "../src/domain/matching";
import { ageOn, isOldEnough } from "../src/domain/age";
import { corsOrigins } from "../src/common/cors";
import { applyDiscount, generateCode, normalizeCode } from "../src/domain/discount";

const teacher = { priceCents: 3500, offersTrial: true, offersPack5: true, offersPack10: true };

describe("pricing", () => {
  it("quotes trial, single and packages", () => {
    assert.deepEqual(quote(teacher, "trial"), { offer: "trial", lessonCount: 1, durationMin: 20, unitPriceCents: 0, discountPct: 0, totalCents: 0 });
    assert.equal(quote(teacher, "single").totalCents, 3500);
    assert.equal(quote(teacher, "pack5").totalCents, 16625); // 5 × 35 × 0.95
    assert.equal(quote(teacher, "pack10").totalCents, 31500); // 10 × 35 × 0.90
  });
  it("rejects prices outside $20–$50 and packages not offered", () => {
    assert.throws(() => quote({ ...teacher, priceCents: 1999 }, "single"), PricingError);
    assert.throws(() => quote({ ...teacher, priceCents: 5001 }, "single"), PricingError);
    assert.throws(() => quote({ ...teacher, offersPack10: false }, "pack10"), PricingError);
  });
  it("splits a package into per-lesson values that add up exactly", () => {
    const total = 16625;
    const parts = Array.from({ length: 5 }, (_, i) => perLessonValue(total, 5, i));
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
  });
});

describe("cancellation", () => {
  const startsAt = new Date("2026-10-14T16:00:00Z");
  it("student > 24 h → full refund", () => {
    const d = decideCancellation({ by: "student", startsAt, now: new Date("2026-10-13T15:59:00Z"), paidCents: 3500 });
    assert.equal(d.refundCents, 3500);
  });
  it("student < 24 h → no refund", () => {
    const d = decideCancellation({ by: "student", startsAt, now: new Date("2026-10-13T16:30:00Z"), paidCents: 3500 });
    assert.equal(d.allowed, true);
    assert.equal(d.refundCents, 0);
  });
  it("teacher cancellation → full refund and admin notified", () => {
    const d = decideCancellation({ by: "teacher", startsAt, now: new Date("2026-10-14T15:00:00Z"), paidCents: 3500 });
    assert.equal(d.refundCents, 3500);
    assert.equal(d.notifyAdmin, true);
  });
  it("cannot cancel a lesson that already started", () => {
    assert.equal(decideCancellation({ by: "student", startsAt, now: startsAt, paidCents: 3500 }).allowed, false);
  });
  it("admin refund window is 24 h after the lesson", () => {
    const end = new Date("2026-10-14T16:50:00Z");
    assert.equal(canAdminRefundAfterLesson(end, new Date("2026-10-15T16:00:00Z")), true);
    assert.equal(canAdminRefundAfterLesson(end, new Date("2026-10-15T17:00:00Z")), false);
  });
  it("3 teacher cancellations in 30 days trigger a warning", () => {
    const now = new Date("2026-10-30T00:00:00Z");
    assert.equal(teacherShouldBeWarned([new Date("2026-10-02"), new Date("2026-10-20"), new Date("2026-10-29")], now), true);
    assert.equal(teacherShouldBeWarned([new Date("2026-09-01"), new Date("2026-10-20"), new Date("2026-10-29")], now), false);
  });
});

describe("earnings", () => {
  it("keeps a 25% commission", () => {
    assert.deepEqual(splitEarning(3500), { grossCents: 3500, commissionCents: 875, netCents: 2625 });
    assert.deepEqual(splitEarning(3325), { grossCents: 3325, commissionCents: 831, netCents: 2494 });
  });
  it("next payout is the 28th", () => {
    assert.equal(nextMonthlyPayoutDate(new Date("2026-10-14T12:00:00Z")).toISOString(), "2026-10-28T00:00:00.000Z");
    assert.equal(nextMonthlyPayoutDate(new Date("2026-10-28T12:00:00Z")).toISOString(), "2026-10-28T00:00:00.000Z");
    assert.equal(nextMonthlyPayoutDate(new Date("2026-10-29T00:00:00Z")).toISOString(), "2026-11-28T00:00:00.000Z");
    assert.equal(nextMonthlyPayoutDate(new Date("2026-12-30T00:00:00Z")).toISOString(), "2027-01-28T00:00:00.000Z");
  });
  it("computes balances by status", () => {
    assert.deepEqual(balances([{ netCents: 2800, status: "available" }, { netCents: 2800, status: "pending" }, { netCents: 1000, status: "paid" }, { netCents: 500, status: "reversed" }]), {
      pendingCents: 2800,
      availableCents: 2800,
      paidCents: 1000,
    });
  });
});

describe("availability", () => {
  // Sarah in Austin teaches Wednesdays 11:00–13:00 Chicago time.
  const base: SlotQuery = {
    teacherTz: "America/Chicago",
    viewerTz: "Europe/Zurich",
    rules: [{ weekday: 3, startMinute: 11 * 60, endMinute: 13 * 60 }],
    blocked: [],
    busy: [],
    from: new Date("2026-10-12T00:00:00Z"),
    to: new Date("2026-10-18T23:59:59Z"),
    now: new Date("2026-10-01T00:00:00Z"),
    durationMin: 50,
  };
  it("converts teacher hours to the student's time zone", () => {
    const slots = generateSlots(base);
    assert.deepEqual(
      slots.map((s) => s.local),
      ["2026-10-14T18:00:00.000+02:00", "2026-10-14T19:00:00.000+02:00"],
    );
    assert.equal(slots[0].startsAt, "2026-10-14T16:00:00.000Z");
  });
  it("removes booked, blocked, too-soon slots and respects vacation mode", () => {
    assert.equal(generateSlots({ ...base, busy: [{ startsAt: new Date("2026-10-14T16:00:00Z"), durationMin: 50 }] }).length, 1);
    assert.equal(generateSlots({ ...base, blocked: [{ startDate: "2026-10-14", endDate: "2026-10-14" }] }).length, 0);
    assert.equal(generateSlots({ ...base, now: new Date("2026-10-14T16:30:00Z") }).length, 0);
    assert.equal(generateSlots({ ...base, vacationMode: true }).length, 0);
  });
  it("handles the U.S. DST change (Nov 1, 2026)", () => {
    const q = { ...base, rules: [{ weekday: 1, startMinute: 11 * 60, endMinute: 12 * 60 }], from: new Date("2026-10-26T00:00:00Z"), to: new Date("2026-11-03T00:00:00Z") };
    // 11:00 Chicago = 16:00Z in CDT (Oct 26) and 17:00Z in CST (Nov 2)
    assert.deepEqual(generateSlots(q).map((s) => s.startsAt), ["2026-10-26T16:00:00.000Z", "2026-11-02T17:00:00.000Z"]);
  });
  it("validates a requested start time", () => {
    assert.equal(isSlotAvailable(base, new Date("2026-10-14T16:00:00Z")), true);
    assert.equal(isSlotAvailable(base, new Date("2026-10-14T16:30:00Z")), false);
  });
});

describe("matching", () => {
  it("ranks business specialists available in the student's evenings first", () => {
    const r = recommend(
      [
        { id: "james", specialties: ["Conversation"], yearsExperience: 5, ratingAvg: 4.8, ratingCount: 40, openBuckets: ["evening"] },
        { id: "sarah", specialties: ["Business English"], yearsExperience: 8, ratingAvg: 4.9, ratingCount: 60, openBuckets: ["evening", "weekend"] },
        { id: "amanda", specialties: ["IELTS Prep"], yearsExperience: 12, ratingAvg: 5, ratingCount: 2, openBuckets: ["morning"] },
      ],
      { goal: "business", preferredTimes: ["evening", "weekend"] },
    );
    assert.equal(r[0].teacherId, "sarah");
    assert.ok(r[0].reasons.includes("Business English specialist"));
  });
});

describe("minimum age (13+)", () => {
  it("counts full years and birthdays correctly", () => {
    const today = new Date("2026-10-01T12:00:00Z");
    assert.equal(ageOn("2013-10-01", today), 13);
    assert.equal(ageOn("2013-10-02", today), 12);
    assert.equal(isOldEnough("2013-10-01", today), true);
    assert.equal(isOldEnough("2013-10-02", today), false);
    assert.equal(isOldEnough("not-a-date", today), false);
  });
});

describe("CORS origins", () => {
  it("accepts exact origins and Vercel preview wildcards", () => {
    const [exact, preview] = corsOrigins("https://amerivo-api.vercel.app/, https://amerivo-api-*.vercel.app");
    assert.equal(exact, "https://amerivo-api.vercel.app");
    assert.ok(preview instanceof RegExp);
    assert.ok((preview as RegExp).test("https://amerivo-api-git-feat-api-auth-nadhir.vercel.app"));
    assert.ok(!(preview as RegExp).test("https://amerivo-api-x.vercel.app.evil.com"));
    assert.ok(!(preview as RegExp).test("https://evil.com/amerivo-api-x.vercel.app"));
  });
});

describe("discount codes", () => {
  it("normalizes what the student types and rejects anything else", () => {
    assert.equal(normalizeCode("  amv-ab12 cd34 "), "AMV-AB12CD34");
    assert.equal(normalizeCode("WELCOME100"), "WELCOME100");
    assert.equal(normalizeCode("ab"), null);
    assert.equal(normalizeCode("-ABC"), null);
    assert.equal(normalizeCode("A'B;C--"), null);
    assert.equal(normalizeCode("x".repeat(40)), null);
    assert.equal(normalizeCode(42), null);
  });
  it("generates unambiguous, random codes", () => {
    const codes = new Set(Array.from({ length: 500 }, generateCode));
    assert.equal(codes.size, 500);
    for (const c of codes) {
      assert.match(c, /^AMV-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      assert.equal(normalizeCode(c), c);
    }
  });
  it("applies the percentage, 100 % = free, waives a remainder under $0.50", () => {
    assert.deepEqual(applyDiscount(3500, 20), { paidCents: 2800, discountCents: 700 });
    assert.deepEqual(applyDiscount(3500, 100), { paidCents: 0, discountCents: 3500 });
    assert.deepEqual(applyDiscount(3325, 15), { paidCents: 2826, discountCents: 499 });
    assert.deepEqual(applyDiscount(2000, 98), { paidCents: 0, discountCents: 2000 }, "$0.40 can't be charged by Stripe");
    assert.deepEqual(applyDiscount(2000, 97), { paidCents: 60, discountCents: 1940 });
    assert.throws(() => applyDiscount(3500, 0));
    assert.throws(() => applyDiscount(3500, 101));
    assert.throws(() => applyDiscount(3500, 12.5));
  });
});
