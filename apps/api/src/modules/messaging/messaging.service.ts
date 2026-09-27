import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AuthUser } from "../../auth/decorators";
import { CLOCK, type Clock } from "../../common/clock";
import { badRequest, forbidden, notFound } from "../../common/errors";
import { DB, type Db } from "../../db/db";
import { bookings, conversations, messages, notifications, teacherProfiles, users } from "../../db/schema";
import { NotificationsService } from "../../integrations/notifications.service";

type Conversation = typeof conversations.$inferSelect;

const PREVIEW_MAX = 200;

/**
 * Student ↔ teacher messaging (one conversation per pair) and the in-app notification inbox.
 * Admins never see conversations (privacy); every conversation route checks participation.
 */
@Injectable()
export class MessagingService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly notifications: NotificationsService,
  ) {}

  private assertMessagingRole(user: AuthUser) {
    if (user.role !== "student" && user.role !== "teacher") throw forbidden("Conversations are private to students and teachers");
  }

  /** Loads a conversation the user takes part in (404 if missing, 403 for anyone else). */
  private async participantConversation(user: AuthUser, id: string): Promise<Conversation> {
    this.assertMessagingRole(user);
    const [c] = await this.db.select().from(conversations).where(eq(conversations.id, id));
    if (!c) throw notFound("Conversation");
    if (c.studentId !== user.id && c.teacherId !== user.id) throw forbidden();
    return c;
  }

  /** The signed-in user's conversations, newest activity first. */
  async list(user: AuthUser) {
    this.assertMessagingRole(user);
    const other = alias(users, "other");
    const mine = user.role === "student" ? conversations.studentId : conversations.teacherId;
    const otherCol = user.role === "student" ? conversations.teacherId : conversations.studentId;
    const rows = await this.db
      .select({
        c: conversations,
        other: { id: other.id, firstName: other.firstName, lastName: other.lastName, avatarUrl: other.avatarUrl, role: other.role },
        teacherSlug: teacherProfiles.slug,
      })
      .from(conversations)
      .innerJoin(other, eq(other.id, otherCol))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, conversations.teacherId))
      .where(eq(mine, user.id))
      .orderBy(desc(sql`coalesce(${conversations.lastMessageAt}, ${conversations.createdAt})`));
    if (!rows.length) return [];
    const ids = rows.map((r) => r.c.id);

    const unread = await this.db
      .select({ conversationId: messages.conversationId, n: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(inArray(messages.conversationId, ids), ne(messages.senderId, user.id), isNull(messages.readAt)))
      .groupBy(messages.conversationId);
    const unreadBy = new Map(unread.map((u) => [u.conversationId, Number(u.n)]));

    const last = await this.db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        body: messages.body,
        kind: messages.kind,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, ids))
      .orderBy(messages.conversationId, desc(messages.createdAt), desc(messages.id));
    const lastBy = new Map(last.map((m) => [m.conversationId, m]));

    return rows.map(({ c, other: o, teacherSlug }) => {
      const m = lastBy.get(c.id);
      return {
        id: c.id,
        // teacherSlug (extra): lets a student open the teacher's public profile; null for students.
        other: { ...o, teacherSlug: o.role === "teacher" ? teacherSlug : null },
        lastMessage: m ? { body: m.body && m.body.length > PREVIEW_MAX ? `${m.body.slice(0, PREVIEW_MAX)}…` : m.body, kind: m.kind, senderId: m.senderId, createdAt: m.createdAt } : null,
        unreadCount: unreadBy.get(c.id) ?? 0,
        lastMessageAt: c.lastMessageAt,
      };
    });
  }

  /** Existing or new conversation. Students: any approved teacher. Teachers: students who booked them. */
  async start(user: AuthUser, p: { teacherSlug?: string; studentId?: string }) {
    this.assertMessagingRole(user);
    let studentId: string;
    let teacherId: string;
    if (user.role === "student") {
      if (!p.teacherSlug || p.studentId) throw badRequest("Provide teacherSlug");
      const [t] = await this.db.select({ userId: teacherProfiles.userId, status: teacherProfiles.status }).from(teacherProfiles).where(eq(teacherProfiles.slug, p.teacherSlug));
      if (!t) throw notFound("Teacher");
      studentId = user.id;
      teacherId = t.userId;
      if (t.status !== "approved" && !(await this.find(studentId, teacherId))) throw notFound("Teacher");
    } else {
      if (!p.studentId || p.teacherSlug) throw badRequest("Provide studentId");
      const [b] = await this.db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.teacherId, user.id), eq(bookings.studentId, p.studentId), ne(bookings.status, "pending_payment")))
        .limit(1);
      if (!b && !(await this.find(p.studentId, user.id))) throw forbidden("You can only message students who booked a lesson with you");
      studentId = p.studentId;
      teacherId = user.id;
    }
    const existing = await this.find(studentId, teacherId);
    if (existing) return existing;
    await this.db.insert(conversations).values({ studentId, teacherId, createdAt: this.clock.now() }).onConflictDoNothing();
    return (await this.find(studentId, teacherId))!;
  }

  private async find(studentId: string, teacherId: string) {
    const [c] = await this.db.select().from(conversations).where(and(eq(conversations.studentId, studentId), eq(conversations.teacherId, teacherId)));
    return c;
  }

  /** One page, oldest → newest. Marks the other side's messages on the page (and before) as read. */
  async messages(user: AuthUser, conversationId: string, q: { before?: Date; limit?: number }) {
    const c = await this.participantConversation(user, conversationId);
    const limit = Math.min(Math.max(Math.trunc(q.limit ?? 50) || 50, 1), 100);
    const cond = q.before ? and(eq(messages.conversationId, c.id), lt(messages.createdAt, q.before)) : eq(messages.conversationId, c.id);
    const page = await this.db
      .select({ id: messages.id, senderId: messages.senderId, kind: messages.kind, body: messages.body, attachmentUrl: messages.attachmentUrl, attachmentName: messages.attachmentName, readAt: messages.readAt, createdAt: messages.createdAt })
      .from(messages)
      .where(cond)
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);
    const hasMore = page.length > limit;
    const items = page.slice(0, limit).reverse();
    const now = this.clock.now();
    const unreadIds = items.filter((m) => m.senderId !== user.id && !m.readAt).map((m) => m.id);
    if (!q.before) {
      // Latest page: everything the other side sent is now seen.
      await this.db.update(messages).set({ readAt: now }).where(and(eq(messages.conversationId, c.id), ne(messages.senderId, user.id), isNull(messages.readAt)));
    } else if (unreadIds.length) {
      await this.db.update(messages).set({ readAt: now }).where(inArray(messages.id, unreadIds));
    }
    for (const m of items) if (unreadIds.includes(m.id)) m.readAt = now;
    // Nothing left to read anywhere → the "new message" notifications are stale too.
    if ((unreadIds.length || !q.before) && (await this.unreadCount(user)).count === 0) {
      await this.db
        .update(notifications)
        .set({ readAt: now })
        .where(and(eq(notifications.userId, user.id), eq(notifications.type, "message"), isNull(notifications.readAt)));
    }
    return { items, hasMore };
  }

  async send(user: AuthUser, conversationId: string, body: string) {
    const c = await this.participantConversation(user, conversationId);
    const text = body.trim();
    if (!text) throw badRequest("Message is empty");
    const now = this.clock.now();
    const [m] = await this.db.transaction(async (tx) => {
      const inserted = await tx.insert(messages).values({ conversationId: c.id, senderId: user.id, kind: "text", body: text, createdAt: now }).returning();
      await tx.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, c.id));
      return inserted;
    });
    const recipientId = c.studentId === user.id ? c.teacherId : c.studentId;
    // E-mail only for the first unread message notification, so a chat doesn't flood the inbox.
    const [pending] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, recipientId), eq(notifications.type, "message"), isNull(notifications.readAt)))
      .limit(1);
    await this.notifications.notify(recipientId, {
      type: "message",
      title: `New message from ${user.firstName}`,
      body: text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX)}…` : text,
      channels: pending ? ["in_app"] : ["in_app", "email"],
    });
    return { id: m.id, conversationId: c.id, senderId: m.senderId, kind: m.kind, body: m.body, attachmentUrl: m.attachmentUrl, attachmentName: m.attachmentName, readAt: m.readAt, createdAt: m.createdAt };
  }

  async unreadCount(user: AuthUser) {
    this.assertMessagingRole(user);
    const mine = user.role === "student" ? conversations.studentId : conversations.teacherId;
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(and(eq(mine, user.id), ne(messages.senderId, user.id), isNull(messages.readAt)));
    return { count: Number(r?.n ?? 0) };
  }

  /* ------------------------------------------------------------ notifications */

  async listNotifications(user: AuthUser, limit?: number) {
    const n = Math.min(Math.max(Math.trunc(limit ?? 20) || 20, 1), 100);
    return this.db
      .select({ id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body, readAt: notifications.readAt, createdAt: notifications.createdAt })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), sql`'in_app' = any(${notifications.channels})`))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(n);
  }

  async unreadNotifications(user: AuthUser) {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt), sql`'in_app' = any(${notifications.channels})`));
    return { count: Number(r?.n ?? 0) };
  }

  async markNotificationsRead(user: AuthUser, ids?: string[]) {
    const base = and(eq(notifications.userId, user.id), isNull(notifications.readAt));
    if (ids && !ids.length) return { updated: 0 };
    const rows = await this.db
      .update(notifications)
      .set({ readAt: this.clock.now() })
      .where(ids ? and(base, inArray(notifications.id, ids)) : base)
      .returning({ id: notifications.id });
    return { updated: rows.length };
  }
}
