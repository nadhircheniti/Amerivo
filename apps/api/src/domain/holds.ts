/** An unpaid booking holds its time slot this long; after that the slot is released. */
export const PAYMENT_HOLD_MIN = 30;

export const holdCutoff = (now: Date) => new Date(now.getTime() - PAYMENT_HOLD_MIN * 60_000);
