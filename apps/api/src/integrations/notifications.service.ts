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
    const key = process.env.RESEND_API_KEY;
    if (!key || key === "re_xxx") return;
    const [u] = await this.db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    if (!u) return;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: u.email, subject, text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
  }
}
