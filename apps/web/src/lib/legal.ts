/**
 * Legal constants shared by the Terms page, sign-up and the acceptance screen.
 *
 * TERMS_VERSION must match apps/api/src/domain/terms.ts: the API refuses students and teachers who
 * haven't accepted this exact version (403 "terms_required"). Changing it asks every user to accept
 * the Terms again on their next visit — do it only when the Terms really change.
 *
 * ⚠ Values in [BRACKETS] are not known yet and must be completed (and the whole text reviewed by a
 * US-licensed attorney) before the platform opens to the public.
 */
export const TERMS_VERSION = "2026-10-07";
/** Shown as "Effective date" (same day as the version). */
export const TERMS_EFFECTIVE = "October 7, 2026";

export const COMPANY = {
  /** Registered name of the LLC (confirmed by the client). */
  legalName: "Amerivo English LLC",
  /** US state where the LLC is organized (also the governing law and the venue). Confirmed: Indiana. */
  state: "Indiana",
  /** Venue for arbitration hearings / courts (§19 of the Terms). */
  county: "[COUNTY]",
  /** Official business address (registered agent or office). */
  address: "[REGISTERED BUSINESS ADDRESS], Indiana, United States",
  email: "contact@amerivoenglish.com",
  /** Business phone (confirmed by the client). */
  phone: "+1 317 516 7573",
  website: "amerivoenglish.com",
  /** DMCA designated agent (register at copyright.gov/dmca-directory). */
  dmcaAgent: "[DMCA DESIGNATED AGENT NAME AND ADDRESS]",
} as const;

/** Privacy Policy version (shown as "Last updated"). */
export const PRIVACY_UPDATED = "October 8, 2026";

/**
 * Non-circumvention (Terms §8). Contractual fees, not public "fines": they compensate Amerivo for
 * the commission it loses when users move lessons off the platform. Confirm the amounts with counsel.
 */
export const NON_CIRCUMVENTION = {
  /** Months after the last contact on Amerivo during which off-platform lessons are forbidden. */
  months: 24,
  /** Minimum fee per student–teacher relationship moved off the platform (US$). */
  minimumFeeUsd: 1500,
  /** Share of the amounts paid off-platform (= the platform commission). */
  feePercent: 25,
} as const;

/** Platform rules repeated in the Terms (keep in sync with apps/api/src/domain). */
export const PLATFORM_RULES = {
  commissionPercent: 25,
  freeCancellationHours: 24,
  disputeWindowHours: 24,
  payoutDay: 28,
  minWithdrawalUsd: 20,
  minStudentAge: 13,
  lessonMinutes: 50,
  trialMinutes: 20,
  minPriceUsd: 20,
  maxPriceUsd: 50,
} as const;
