import { Injectable, ServiceUnavailableException } from "@nestjs/common";

/** Daily.co REST API: one private room per lesson + short-lived meeting tokens. */
@Injectable()
export class DailyService {
  private async call<T>(path: string, body: unknown): Promise<T> {
    const key = process.env.DAILY_API_KEY;
    if (!key || key === "xxx") throw new ServiceUnavailableException("Daily.co is not configured (DAILY_API_KEY)");
    const res = await fetch(`https://api.daily.co/v1${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ServiceUnavailableException(`Daily.co error ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  /** Private room that opens 10 minutes before and expires 30 minutes after the lesson. */
  createRoom(p: { name: string; startsAt: Date; durationMin: number }) {
    const nbf = Math.floor(p.startsAt.getTime() / 1000) - 10 * 60;
    const exp = Math.floor(p.startsAt.getTime() / 1000) + (p.durationMin + 30) * 60;
    return this.call<{ name: string; url: string }>("/rooms", {
      name: p.name,
      privacy: "private",
      properties: { nbf, exp, max_participants: 2, enable_screenshare: true, enable_chat: true, eject_at_room_exp: true },
    });
  }

  meetingToken(p: { room: string; userName: string; isOwner: boolean; exp: Date }) {
    return this.call<{ token: string }>("/meeting-tokens", {
      properties: { room_name: p.room, user_name: p.userName, is_owner: p.isOwner, exp: Math.floor(p.exp.getTime() / 1000) },
    });
  }
}
