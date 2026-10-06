import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { DB, type Db } from "../../db/db";
import { auditLogs, notifications, supportMessages, supportReplies, users } from "../../db/schema";
import { CLOCK, type Clock } from "../../common/clock";
import { notFound } from "../../common/errors";
import type { AuthUser } from "../../auth/decorators";
import { NotificationsService } from "../../integrations/notifications.service";
import type { SupportStatus, SupportTopic } from "./support.dto";

/** The public support address (shown on the site, receives the contact form, used as Reply-To). */
export const supportEmail = () => process.env.SUPPORT_EMAIL?.trim() || "contact@amerivoenglish.com";

const TOPIC_LABEL: Record<SupportTopic, string> = {
  general: "General question",
  student: "Student support",
  teacher: "Teacher support",
  billing: "Payments & billing",
  business: "Business / companies",
  technical: "Technical problem",
};
const PAGE_SIZE = 25;

/**
 * Support inbox: messages from the contact form, answered by admins.
 * - New message → stored, admins get an in-app notification, and the support mailbox gets a copy
 *   (Reply-To = the sender) when e-mail (Resend) is configured.
 * - Admin reply → stored and e-mailed to the sender (Reply-To = the support address), so the
 *   conversation can continue from the support mailbox.
 */
@Injectable()
export class SupportService {
  private readonly log = new Logger(SupportService.name);
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly notifications: NotificationsService,
  ) {}

  async submit(input: { name: string; email: string; topic: SupportTopic; message: string; locale?: string; website?: string }) {
    // Bots fill the hidden field: answer as if it worked, store nothing.
    if (input.website?.trim()) return { ok: true };
    const email = input.email.trim().toLowerCase();
    const [account] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    const [row] = await this.db
      .insert(supportMessages)
      .values({
        name: input.name.trim(),
        email,
        topic: input.topic,
        message: input.message.trim(),
        locale: input.locale ?? null,
        userId: account?.id ?? null,
        createdAt: this.clock.now(),
      })
      .returning();

    const admins = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")));
    if (admins.length) {
      await this.db
        .insert(notifications)
        .values(
          admins.map((a) => ({
            userId: a.id,
            type: "support.new",
            title: `New message from ${row.name}`,
            body: `${TOPIC_LABEL[input.topic]} — ${row.message.slice(0, 140)}`,
            channels: ["in_app" as const],
          })),
        );
    }

    const subject = `[Amerivo English] ${TOPIC_LABEL[input.topic]} — ${row.name}`;
    const text = `New message from the contact form\n\nFrom: ${row.name} <${row.email}>\nTopic: ${TOPIC_LABEL[input.topic]}\nAccount: ${account ? "yes" : "no"}\nLanguage: ${row.locale ?? "—"}\n\n${row.message}\n\n— Reply from the admin space (Support) or answer this e-mail directly.`;
    await this.notifications.sendEmail({ to: supportEmail(), subject, text, replyTo: row.email }).catch((e) => this.log.warn(`support copy failed: ${e}`));
    await this.notifications
      .sendEmail({
        to: row.email,
        subject: "We received your message — Amerivo English",
        text: `Hi ${row.name},\n\nThank you for contacting Amerivo English. We received your message and will reply within 1–2 business days.\n\nYour message:\n${row.message}\n\nThe Amerivo English team\n${supportEmail()}`,
        replyTo: supportEmail(),
      })
      .catch((e) => this.log.warn(`support acknowledgment failed: ${e}`));
    return { ok: true };
  }

  async list(p: { status?: SupportStatus; search?: string; page?: number }) {
    const page = Math.max(1, p.page ?? 1);
    const q = p.search?.trim();
    const where = and(
      p.status ? eq(supportMessages.status, p.status) : undefined,
      q ? or(ilike(supportMessages.name, `%${q}%`), ilike(supportMessages.email, `%${q}%`), ilike(supportMessages.message, `%${q}%`)) : undefined,
    );
    const replyCount = this.db.$count(supportReplies, eq(supportReplies.messageId, supportMessages.id));
    const [rows, [total]] = await Promise.all([
      this.db
        .select({ m: supportMessages, replies: replyCount, role: users.role })
        .from(supportMessages)
        .leftJoin(users, eq(users.id, supportMessages.userId))
        .where(where)
        .orderBy(desc(supportMessages.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      this.db.select({ n: count() }).from(supportMessages).where(where),
    ]);
    return { items: rows.map((r) => ({ ...this.publicMessage(r.m), role: r.role ?? null, replies: Number(r.replies) })), total: total.n, page, pageSize: PAGE_SIZE };
  }

  async get(id: string) {
    const [row] = await this.db
      .select({ m: supportMessages, role: users.role })
      .from(supportMessages)
      .leftJoin(users, eq(users.id, supportMessages.userId))
      .where(eq(supportMessages.id, id));
    if (!row) throw notFound("Message");
    const replies = await this.db
      .select({ r: supportReplies, firstName: users.firstName, lastName: users.lastName })
      .from(supportReplies)
      .leftJoin(users, eq(users.id, supportReplies.authorId))
      .where(eq(supportReplies.messageId, id))
      .orderBy(asc(supportReplies.createdAt));
    return {
      ...this.publicMessage(row.m),
      role: row.role ?? null,
      replies: replies.map((x) => ({
        id: x.r.id,
        body: x.r.body,
        emailed: x.r.emailed,
        createdAt: x.r.createdAt,
        author: x.firstName ? `${x.firstName} ${x.lastName ?? ""}`.trim() : null,
      })),
      emailEnabled: this.notifications.emailEnabled(),
      supportEmail: supportEmail(),
    };
  }

  async reply(admin: AuthUser, id: string, body: string) {
    const [m] = await this.db.select().from(supportMessages).where(eq(supportMessages.id, id));
    if (!m) throw notFound("Message");
    const text = body.trim();
    let emailed = false;
    let emailError: string | null = null;
    try {
      emailed = await this.notifications.sendEmail({
        to: m.email,
        subject: `Re: your message to Amerivo English`,
        text: `Hi ${m.name},\n\n${text}\n\nBest regards,\n${admin.firstName} — Amerivo English\n${supportEmail()}\n\n----- Your message -----\n${m.message}`,
        replyTo: supportEmail(),
      });
    } catch (e) {
      emailError = String(e);
      this.log.warn(`support reply e-mail failed: ${e}`);
    }
    const now = this.clock.now();
    const [r] = await this.db.insert(supportReplies).values({ messageId: id, authorId: admin.id, body: text, emailed, createdAt: now }).returning();
    await this.db.update(supportMessages).set({ status: "answered", lastReplyAt: now }).where(eq(supportMessages.id, id));
    await this.db.insert(auditLogs).values({ actorId: admin.id, action: "support.reply", entity: "support_message", entityId: id, data: { emailed } });
    return { id: r.id, emailed, emailError: emailError ? "The e-mail could not be sent; the reply was saved." : null };
  }

  async setStatus(admin: AuthUser, id: string, status: SupportStatus) {
    const [m] = await this.db.update(supportMessages).set({ status }).where(eq(supportMessages.id, id)).returning({ id: supportMessages.id });
    if (!m) throw notFound("Message");
    await this.db.insert(auditLogs).values({ actorId: admin.id, action: `support.${status}`, entity: "support_message", entityId: id });
    return { id, status };
  }

  async openCount() {
    const [r] = await this.db.select({ n: count() }).from(supportMessages).where(eq(supportMessages.status, "open"));
    return r.n;
  }

  private publicMessage(m: typeof supportMessages.$inferSelect) {
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      topic: m.topic,
      message: m.message,
      locale: m.locale,
      status: m.status,
      hasAccount: !!m.userId,
      lastReplyAt: m.lastReplyAt,
      createdAt: m.createdAt,
    };
  }
}
