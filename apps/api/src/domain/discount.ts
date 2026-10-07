/**
 * One-time discount codes (admin): a percentage off a lesson or a package, usable once in total.
 * Amerivo bears the discount: the teacher's share is computed on the price before the code.
 */
import { randomInt } from "node:crypto";

export const MIN_PERCENT = 1;
export const MAX_PERCENT = 100;
/** Stripe can't charge less than $0.50: a smaller remainder is waived (the lesson becomes free). */
export const MIN_CHARGE_CENTS = 50;

/** No 0/O or 1/I/L: codes are read aloud and typed by hand. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const FORMAT = /^[A-Z0-9][A-Z0-9-]{2,30}[A-Z0-9]$/;

/** "  amv-ab12 cd34 " → "AMV-AB12CD34"; null when it can't be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.replace(/\s+/g, "").toUpperCase();
  return FORMAT.test(code) ? code : null;
}

/**
 * Random code like "AMV-7KQ2-XH9M": 8 characters from a 31-letter alphabet (≈ 8.5e11 combinations),
 * drawn with a cryptographic generator, so codes can't be guessed (checks are also rate-limited).
 */
export function generateCode(): string {
  const pick = () => ALPHABET[randomInt(ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `AMV-${block()}-${block()}`;
}

export function isValidPercent(p: unknown): p is number {
  return typeof p === "number" && Number.isInteger(p) && p >= MIN_PERCENT && p <= MAX_PERCENT;
}

/** Price after the code. Whole cents; a remainder under $0.50 is waived (Stripe minimum). */
export function applyDiscount(totalCents: number, percent: number): { paidCents: number; discountCents: number } {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error("totalCents must be a non-negative integer");
  if (!isValidPercent(percent)) throw new Error("percent must be an integer between 1 and 100");
  let discountCents = Math.round((totalCents * percent) / 100);
  let paidCents = totalCents - discountCents;
  if (paidCents > 0 && paidCents < MIN_CHARGE_CENTS) {
    paidCents = 0;
    discountCents = totalCents;
  }
  return { paidCents, discountCents };
}
