/** Injectable clock so time-based rules (24 h policy, payouts) are testable. */
export const CLOCK = Symbol("CLOCK");
export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };
