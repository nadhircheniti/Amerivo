/**
 * Lesson pricing rules (spec §5, §8).
 * - Teachers set a price per 50-minute lesson between $20 and $50.
 * - Trial ("demo") lessons are 20 minutes and free.
 * - Optional packages the teacher can offer: 5 lessons −5%, 10 lessons −10%.
 */
export const MIN_PRICE_CENTS = 2000;
export const MAX_PRICE_CENTS = 5000;
export const LESSON_MINUTES = 50;
export const TRIAL_MINUTES = 20;

export type Offer = "trial" | "single" | "pack5" | "pack10";

export interface TeacherPricing {
  priceCents: number;
  offersTrial: boolean;
  offersPack5: boolean;
  offersPack10: boolean;
}

export interface Quote {
  offer: Offer;
  lessonCount: number;
  durationMin: number;
  unitPriceCents: number;
  discountPct: number;
  totalCents: number;
}

export class PricingError extends Error {}

export function assertValidPrice(priceCents: number) {
  if (!Number.isInteger(priceCents) || priceCents < MIN_PRICE_CENTS || priceCents > MAX_PRICE_CENTS) {
    throw new PricingError(`Lesson price must be between $20 and $50 (got ${priceCents} cents)`);
  }
}

export function quote(teacher: TeacherPricing, offer: Offer): Quote {
  assertValidPrice(teacher.priceCents);
  switch (offer) {
    case "trial":
      if (!teacher.offersTrial) throw new PricingError("This teacher does not offer trial lessons");
      return { offer, lessonCount: 1, durationMin: TRIAL_MINUTES, unitPriceCents: 0, discountPct: 0, totalCents: 0 };
    case "single":
      return { offer, lessonCount: 1, durationMin: LESSON_MINUTES, unitPriceCents: teacher.priceCents, discountPct: 0, totalCents: teacher.priceCents };
    case "pack5":
      if (!teacher.offersPack5) throw new PricingError("This teacher does not offer the 5-lesson package");
      return pack(teacher.priceCents, 5, 5);
    case "pack10":
      if (!teacher.offersPack10) throw new PricingError("This teacher does not offer the 10-lesson package");
      return pack(teacher.priceCents, 10, 10);
  }
}

function pack(unit: number, count: 5 | 10, discountPct: number): Quote {
  const totalCents = Math.round((unit * count * (100 - discountPct)) / 100);
  return { offer: count === 5 ? "pack5" : "pack10", lessonCount: count, durationMin: LESSON_MINUTES, unitPriceCents: unit, discountPct, totalCents };
}

/** Price attributed to one lesson taken from a package (used for teacher earnings). */
export function perLessonValue(totalCents: number, lessonCount: number, lessonIndex: number) {
  const base = Math.floor(totalCents / lessonCount);
  const remainder = totalCents - base * lessonCount;
  // Spread the rounding remainder over the first lessons so the sum is exact.
  return base + (lessonIndex < remainder ? 1 : 0);
}
