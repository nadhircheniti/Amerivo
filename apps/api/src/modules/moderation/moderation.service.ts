import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gt, gte, inArray, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AuthUser } from "../../auth/decorators";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, notFound } from "../../common/errors";
import { DB, type Db } from "../../db/db";
import { auditLogs, lessonChatMessages, messages, moderationFlags, users } from "../../db/schema";
import { findingTypes, scanContactDetails, type ContactFindingType } from "../../domain/contact-guard";
import { NotificationsService } from "../../integrations/notifications.service";

export const MODERATION_CONTEXTS = ["message", "lesson_chat", "lesson_notes", "lesson_report", "review", "profile", "material", "booking"] as const;
export type ModerationContext = (typeof MODERATION_CONTEXTS)[number];
export const MODERATION_STATUSES = ["open", "dismissed", "warned", "blocked"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
export type ModerationAction = "dismiss" | "warn" | "block";

/** What the client is told about its own text (shown as a warning, never the admin details). */
export interface Screened {
  text: string;
  redacted: boolean;
  types: ContactFindingType[];
}

interface Where {
  context: ModerationContext;
  recipientId?: string | null;
  conversationId?: string | null;
  bookingId?: string | null;
}

/** Window in which repeated saves of the same shared notes update one flag instead of creating new ones. */
const NOTES_DEDUPE_MS = 10 * 60_000;
/** Flags counted for the "repeat offender" figure shown to admins. */
const REPEAT_WINDOW_DAYS = 30;
const PAGE = 25;

/**
 * Trust & safety (Terms §8): screens every text one user sends to another for contact details,
 * delivers it redacted, and keeps the original for admin review (warn or block the sender).
 */
@Injectable()
export class ModerationService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly notifications: NotificationsService,
  ) {}

  /** Redacts contact details from a text that will be delivered; records a flag when anything was found. */
  async screen(sender: { id: string }, input: string, where: Where): Promise<Screened> {
    const scan = scanContactDetails(input);
    const types = findingTypes(scan.findings);
    if (types.length) await this.record(sender.id, input, scan.text, types, where);
    return { text: scan.text, redacted: scan.redacted, types };
  }

  /**
   * For texts shown publicly or reviewed later (teacher profile, document titles): contact details
   * are refused outright (400) rather than redacted. Messaging-app names alone are allowed but recorded.
   */
  async rejectContactDetails(sender: { id: string }, fields: Record<string, string | null | undefined>, context: ModerationContext) {
    for (const [field, value] of Object.entries(fields)) {
      if (!value) continue;
      const scan = scanContactDetails(value);
      const types = findingTypes(scan.findings);
      if (!types.length) continue;
      await this.record(sender.id, value, scan.redacted ? null : value, types, { context });
      if (scan.redacted) {
        throw badRequest(`Contact details (e-mail, phone number, links or social media handles) are not allowed in "${field}". See the Terms of Service, section 8.`);
      }
    }
  }

  private async record(userId: string, original: string, delivered: string | null, types: ContactFindingType[], where: Where) {
    const now = this.clock.now();
    if (where.context === "lesson_notes" && where.bookingId) {
      // Shared notes are saved every few seconds while typing: keep one flag per author and lesson.
      const [recent] = await this.db
        .select({ id: moderationFlags.id, types: moderationFlags.types })
        .from(moderationFlags)
        .where(
          and(
            eq(moderationFlags.userId, userId),
            eq(moderationFlags.context, "lesson_notes"),
            eq(moderationFlags.bookingId, where.bookingId),
            eq(moderationFlags.status, "open"),
            gte(moderationFlags.createdAt, new Date(now.getTime() - NOTES_DEDUPE_MS)),
          ),
        )
        .limit(1);
      if (recent) {
        await this.db
          .update(moderationFlags)
          .set({ originalText: original, deliveredText: delivered, types: [...new Set([...recent.types, ...types])] })
          .where(eq(moderationFlags.id, recent.id));
        return;
      }
    }
    await this.db.insert(moderationFlags).values({
      userId,
      recipientId: where.recipientId ?? null,
      context: where.context,
      conversationId: where.conversationId ?? null,
      bookingId: where.bookingId ?? null,
      originalText: original,
      deliveredText: delivered,
      types,
      createdAt: now,
    });
  }

  /* ------------------------------------------------------------------ admin */

  /** GET /admin/moderation — newest first, with the sender's recent flag count. */
  async list(q: { status?: ModerationStatus; page?: number }) {
    const page = Math.max(1, Math.trunc(q.page ?? 1) || 1);
    const sender = alias(users, "sender");
    const recipient = alias(users, "recipient");
    const where = q.status ? eq(moderationFlags.status, q.status) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: moderationFlags.id,
          context: moderationFlags.context,
          types: moderationFlags.types,
          originalText: moderationFlags.originalText,
          deliveredText: moderationFlags.deliveredText,
          status: moderationFlags.status,
          reviewNote: moderationFlags.reviewNote,
          reviewedAt: moderationFlags.reviewedAt,
          bookingId: moderationFlags.bookingId,
          conversationId: moderationFlags.conversationId,
          createdAt: moderationFlags.createdAt,
          sender: { id: sender.id, firstName: sender.firstName, lastName: sender.lastName, email: sender.email, role: sender.role, status: sender.status },
          recipient: { id: recipient.id, firstName: recipient.firstName, lastName: recipient.lastName, role: recipient.role },
        })
        .from(moderationFlags)
        .innerJoin(sender, eq(sender.id, moderationFlags.userId))
        .leftJoin(recipient, eq(recipient.id, moderationFlags.recipientId))
        .where(where)
        .orderBy(desc(moderationFlags.createdAt), desc(moderationFlags.id))
        .limit(PAGE)
        .offset((page - 1) * PAGE),
      this.db.select({ total: count() }).from(moderationFlags).where(where),
    ]);
    const senderIds = [...new Set(rows.map((r) => r.sender.id))];
    const since = new Date(this.clock.now().getTime() - REPEAT_WINDOW_DAYS * 86_400_000);
    const recent = senderIds.length
      ? await this.db
          .select({ userId: moderationFlags.userId, n: count() })
          .from(moderationFlags)
          .where(and(inArray(moderationFlags.userId, senderIds), gte(moderationFlags.createdAt, since)))
          .groupBy(moderationFlags.userId)
      : [];
    const recentBy = new Map(recent.map((r) => [r.userId, Number(r.n)]));
    return {
      items: rows.map((r) => ({ ...r, recipient: r.recipient?.id ? r.recipient : null, senderFlags30d: recentBy.get(r.sender.id) ?? 0 })),
      total: Number(total),
      page,
      pageSize: PAGE,
    };
  }

  /**
   * The conversation (or classroom chat) around a report: up to 20 messages before it and 5 after,
   * as delivered (redacted). Only for reported texts, so admins don't browse private conversations.
   */
  async context(id: string) {
    const [flag] = await this.db.select().from(moderationFlags).where(eq(moderationFlags.id, id));
    if (!flag) throw notFound("Report");
    const at = flag.createdAt;
    const pick = { id: messages.id, senderId: messages.senderId, body: messages.body, createdAt: messages.createdAt };
    if (flag.context === "message" && flag.conversationId) {
      const [before, after] = await Promise.all([
        this.db.select(pick).from(messages).where(and(eq(messages.conversationId, flag.conversationId), lte(messages.createdAt, at))).orderBy(desc(messages.createdAt)).limit(20),
        this.db.select(pick).from(messages).where(and(eq(messages.conversationId, flag.conversationId), gt(messages.createdAt, at))).orderBy(asc(messages.createdAt)).limit(5),
      ]);
      return { kind: "conversation" as const, messages: [...before.reverse(), ...after] };
    }
    if (flag.context === "lesson_chat" && flag.bookingId) {
      const c = { id: lessonChatMessages.id, senderId: lessonChatMessages.senderId, body: lessonChatMessages.body, createdAt: lessonChatMessages.createdAt };
      const [before, after] = await Promise.all([
        this.db.select(c).from(lessonChatMessages).where(and(eq(lessonChatMessages.bookingId, flag.bookingId), lte(lessonChatMessages.createdAt, at))).orderBy(desc(lessonChatMessages.createdAt)).limit(20),
        this.db.select(c).from(lessonChatMessages).where(and(eq(lessonChatMessages.bookingId, flag.bookingId), gt(lessonChatMessages.createdAt, at))).orderBy(asc(lessonChatMessages.createdAt)).limit(5),
      ]);
      return { kind: "lesson_chat" as const, messages: [...before.reverse(), ...after] };
    }
    return { kind: "none" as const, messages: [] };
  }

  async openCount() {
    const [r] = await this.db.select({ n: count() }).from(moderationFlags).where(eq(moderationFlags.status, "open"));
    return Number(r?.n ?? 0);
  }

  /** dismiss = false alarm · warn = notify the sender · block = disable the sender's account. */
  async review(admin: AuthUser, id: string, action: ModerationAction, note?: string) {
    const [flag] = await this.db.select().from(moderationFlags).where(eq(moderationFlags.id, id));
    if (!flag) throw notFound("Report");
    const [target] = await this.db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, flag.userId));
    if (action === "block" && target?.role === "admin") throw badRequest("Admin accounts cannot be blocked from here");
    const status: ModerationStatus = action === "dismiss" ? "dismissed" : action === "warn" ? "warned" : "blocked";
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      await tx.update(moderationFlags).set({ status, reviewedBy: admin.id, reviewedAt: now, reviewNote: note ?? null }).where(eq(moderationFlags.id, id));
      if (action === "block") await tx.update(users).set({ status: "blocked" }).where(eq(users.id, flag.userId));
      await tx.insert(auditLogs).values({ actorId: admin.id, action: `moderation.${action}`, entity: "user", entityId: flag.userId, data: { flagId: id, note: note ?? null } });
    });
    if (action === "warn") {
      await this.notifications.notify(flag.userId, {
        type: "policy_warning",
        title: "Warning: sharing contact details is not allowed on Amerivo",
        body:
          "You shared, or tried to share, personal contact details (e-mail, phone number, links or social media/messaging apps). " +
          "This breaks section 8 of the Amerivo Terms of Service. Further violations may lead to suspension or permanent closure of your account " +
          "and to the fees described in the Terms. Please keep all communication and payments on Amerivo." +
          (note ? `\n\nNote from the Amerivo team: ${note}` : ""),
      });
    }
    return { id, status };
  }
}
