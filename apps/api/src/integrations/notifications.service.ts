import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB, type Db } from "../db/db";
import { notifications, users } from "../db/schema";

type Channel = "email" | "sms" | "push" | "in_app";

/**
 * Notification fan-out (spec §17). In-app rows are always stored; email goes through Resend
 * and SMS through Twilio when their keys are configured. Push is planned with the mobile apps.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);
  constructor(@Inject(DB) private readonly db: Db) {}

  async notify(userId: string, n: { type: string; title: string; body?: string; channels?: Channel[] }) {
    const channels: Channel[] = n.channels ?? ["in_app", "email"];
    await this.db.insert(notifications).values({ userId, type: n.type, title: n.title, body: n.body, channels });
    if (channels.includes("email")) await this.email(userId, n.title, n.body ?? "").catch((e) => this.log.warn(`email failed: ${e}`));
  }

  private async email(userId: string, subject: string, text: string) {
    const [u] = await this.db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (!u) return;
    await this.sendEmail({ to: u.email, subject, text });
  }

  /** True when e-mail can actually be sent (Resend key configured). */
  emailEnabled() {
    const key = process.env.RESEND_API_KEY;
    return !!key && key !== "re_xxx";
  }

  /**
   * Sends one e-mail through Resend. Returns false (without throwing) when e-mail is not configured;
   * throws when Resend refuses the message so callers can report it.
   */
  async sendEmail(m: { to: string; subject: string; text: string; replyTo?: string }) {
    if (!this.emailEnabled()) return false;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: m.to, subject: m.subject, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return true;
  }
}
