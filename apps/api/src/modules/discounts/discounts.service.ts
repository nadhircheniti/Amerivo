import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { AuthUser } from "../../auth/decorators";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, conflict, notFound } from "../../common/errors";
import { DB, type Db } from "../../db/db";
import { auditLogs, bookings, discountCodes, lessonPackages, teacherProfiles, users } from "../../db/schema";
import { applyDiscount, generateCode, isValidPercent, normalizeCode } from "../../domain/discount";
import { PricingError, quote, type Offer } from "../../domain/pricing";

/** A database handle or an open transaction. */
export type DbExecutor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The same message for "unknown", "used", "disabled" and "expired": nothing to learn by trying codes. */
const INVALID = "This code is not valid or has already been used.";

export type DiscountStatus = "available" | "reserved" | "used" | "disabled" | "expired";

@Injectable()
export class DiscountsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /* ------------------------------------------------------------------ admin */

  /** New one-time code: the admin's own code, or a random one ("AMV-7KQ2-XH9M"). */
  async create(admin: AuthUser, input: { percent: number; code?: string; note?: string; expiresAt?: Date }) {
    if (!isValidPercent(input.percent)) throw badRequest("The discount must be a whole percentage between 1 and 100");
    const now = this.clock.now();
    if (input.expiresAt && input.expiresAt <= now) throw badRequest("The expiry date must be in the future");
    let code: string;
    if (input.code?.trim()) {
      const c = normalizeCode(input.code);
      if (!c) throw badRequest("A code has 4 to 32 letters, digits or dashes");
      code = c;
    } else {
      code = generateCode();
    }
    const note = input.note?.trim() || null;
    const [row] = await this.db
      .insert(discountCodes)
      .values({ code, percent: input.percent, note, createdBy: admin.id, createdAt: now, expiresAt: input.expiresAt ?? null })
      .onConflictDoNothing()
      .returning();
    if (!row) throw conflict("This code already exists");
    await this.db.insert(auditLogs).values({ actorId: admin.id, action: "discount.create", entity: "discount_code", entityId: row.id, data: { code, percent: input.percent } });
    return this.shape(row, null);
  }

  /** All codes, newest first, with who used them and on which order. */
  async list() {
    const claimer = users;
    const rows = await this.db
      .select({ c: discountCodes, claimedBy: { id: claimer.id, firstName: claimer.firstName, lastName: claimer.lastName, email: claimer.email } })
      .from(discountCodes)
      .leftJoin(claimer, eq(claimer.id, discountCodes.claimedBy))
      .orderBy(desc(discountCodes.createdAt))
      .limit(500);
    const ids = rows.filter((r) => r.c.claimedAt).map((r) => r.c.id);
    const confirmed = new Set<string>();
    if (ids.length) {
      // "Used" once the order is paid/confirmed; "reserved" while the payment is pending.
      const used = await this.db
        .select({ id: bookings.discountCodeId })
        .from(bookings)
        .where(and(inArray(bookings.discountCodeId, ids), inArray(bookings.status, ["confirmed", "completed", "no_show", "refunded"])));
      const usedPkgs = await this.db
        .select({ id: lessonPackages.discountCodeId })
        .from(lessonPackages)
        .where(and(inArray(lessonPackages.discountCodeId, ids), inArray(lessonPackages.status, ["active", "exhausted", "refunded"])));
      for (const r of [...used, ...usedPkgs]) if (r.id) confirmed.add(r.id);
    }
    const codes = rows.map((r) => this.shape(r.c, r.claimedBy?.id ? r.claimedBy : null, confirmed.has(r.c.id)));
    // What the codes cost Amerivo so far (paid orders): full price − price paid. The commission shown
    // in the analytics is computed on full prices, so this is the amount to subtract from it.
    const [single] = await this.db
      .select({ cents: sql<number>`coalesce(sum(${bookings.earningBaseCents} - ${bookings.priceCents}), 0)::int` })
      .from(bookings)
      .where(and(isNotNull(bookings.discountCodeId), inArray(bookings.status, ["confirmed", "completed", "no_show"])));
    const [packs] = await this.db
      .select({ cents: sql<number>`coalesce(sum(${lessonPackages.earningBaseCents} - ${lessonPackages.totalCents}), 0)::int` })
      .from(lessonPackages)
      .where(and(isNotNull(lessonPackages.discountCodeId), inArray(lessonPackages.status, ["active", "exhausted"])));
    return { codes, usedCount: codes.filter((c) => c.status === "used").length, discountedCents: Number(single?.cents ?? 0) + Number(packs?.cents ?? 0) };
  }

  /** Stops a code from being used (an order already made with it is not changed). */
  async disable(admin: AuthUser, id: string) {
    const [row] = await this.db
      .update(discountCodes)
      .set({ disabledAt: this.clock.now() })
      .where(and(eq(discountCodes.id, id), isNull(discountCodes.disabledAt)))
      .returning();
    if (!row) {
      const [exists] = await this.db.select({ id: discountCodes.id }).from(discountCodes).where(eq(discountCodes.id, id));
      if (!exists) throw notFound("Discount code");
      return { id, disabled: true };
    }
    await this.db.insert(auditLogs).values({ actorId: admin.id, action: "discount.disable", entity: "discount_code", entityId: id, data: { code: row.code } });
    return { id, disabled: true };
  }

  private shape(c: typeof discountCodes.$inferSelect, claimedBy: { id: string; firstName: string; lastName: string; email: string } | null, confirmed = false) {
    const now = this.clock.now();
    const status: DiscountStatus = c.claimedAt ? (confirmed ? "used" : "reserved") : c.disabledAt ? "disabled" : c.expiresAt && c.expiresAt <= now ? "expired" : "available";
    return { id: c.id, code: c.code, percent: c.percent, note: c.note, createdAt: c.createdAt, expiresAt: c.expiresAt, disabledAt: c.disabledAt, claimedAt: c.claimedAt, claimedBy, status };
  }

  /* ---------------------------------------------------------------- student */

  /** Price preview at checkout. Doesn't reserve the code (that happens when the booking is created). */
  async preview(input: { code: string; teacherSlug: string; offer: Offer }) {
    const code = normalizeCode(input.code);
    if (!code) throw badRequest(INVALID);
    const usable = await this.findUsable(this.db, code);
    if (!usable) throw badRequest(INVALID);
    if (input.offer === "trial") throw badRequest("Discount codes can't be used on a free trial lesson");
    const [pricing] = await this.db
      .select({ priceCents: teacherProfiles.priceCents, offersTrial: teacherProfiles.offersTrial, offersPack5: teacherProfiles.offersPack5, offersPack10: teacherProfiles.offersPack10 })
      .from(teacherProfiles)
      .where(and(eq(teacherProfiles.slug, input.teacherSlug), eq(teacherProfiles.status, "approved")));
    if (!pricing) throw notFound("Teacher");
    let q;
    try {
      q = quote(pricing, input.offer);
    } catch (e) {
      if (e instanceof PricingError) throw badRequest(e.message);
      throw e;
    }
    const { paidCents, discountCents } = applyDiscount(q.totalCents, usable.percent);
    return { code, percent: usable.percent, totalCents: q.totalCents, discountCents, paidCents };
  }

  /* ------------------------------------------------- used by bookings */

  private async findUsable(db: DbExecutor, code: string) {
    const now = this.clock.now();
    const [row] = await db
      .select()
      .from(discountCodes)
      .where(and(eq(discountCodes.code, code), isNull(discountCodes.claimedAt), isNull(discountCodes.disabledAt), or(isNull(discountCodes.expiresAt), gt(discountCodes.expiresAt, now))));
    return row ?? null;
  }

  /**
   * Reserves a code for an order, inside the booking transaction. Atomic: of two students using the
   * same code at the same moment, only one gets it (the update only matches an unclaimed code).
   */
  async claim(tx: DbExecutor, rawCode: string, studentId: string) {
    const code = normalizeCode(rawCode);
    if (!code) throw badRequest(INVALID);
    const now = this.clock.now();
    const [row] = await tx
      .update(discountCodes)
      .set({ claimedAt: now, claimedBy: studentId })
      .where(and(eq(discountCodes.code, code), isNull(discountCodes.claimedAt), isNull(discountCodes.disabledAt), or(isNull(discountCodes.expiresAt), gt(discountCodes.expiresAt, now))))
      .returning();
    if (!row) throw badRequest(INVALID);
    return row;
  }

  /** Gives a code back (order never paid, or lesson cancelled): it can be used again. */
  async release(db: DbExecutor, codeId: string | null | undefined) {
    if (!codeId) return;
    await db.update(discountCodes).set({ claimedAt: null, claimedBy: null }).where(eq(discountCodes.id, codeId));
  }
}
