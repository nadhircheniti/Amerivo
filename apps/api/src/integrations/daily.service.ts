import { Injectable, ServiceUnavailableException } from "@nestjs/common";

type Room = { name: string; url: string };

/** Teacher + student + one Amerivo quality observer (admin, visible to both). */
export const MAX_PARTICIPANTS = 3;

/** Daily.co REST API: one private room per lesson + short-lived meeting tokens. */
@Injectable()
export class DailyService {
  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
    const key = process.env.DAILY_API_KEY;
    if (!key || key === "xxx") throw new ServiceUnavailableException("Daily.co is not configured (DAILY_API_KEY)");
    const res = await fetch(`https://api.daily.co/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, data };
  }

  /**
   * Private room for one lesson, open from `opensAt` until the planned end of the lesson.
   * If both participants arrive at the same moment, the second call finds the room created by the first.
   */
  async createRoom(p: { name: string; opensAt: Date; startsAt: Date; durationMin: number }): Promise<Room> {
    const nbf = Math.floor(p.opensAt.getTime() / 1000);
    const exp = Math.floor(p.startsAt.getTime() / 1000) + (p.durationMin + 30) * 60;
    const created = await this.call<Room>("POST", "/rooms", {
      name: p.name,
      privacy: "private",
      properties: { nbf, exp, max_participants: MAX_PARTICIPANTS, enable_screenshare: true, enable_chat: false, eject_at_room_exp: true, enable_prejoin_ui: false },
    });
    if (created.ok) return created.data;
    const existing = await this.call<Room>("GET", `/rooms/${encodeURIComponent(p.name)}`);
    if (existing.ok) return existing.data;
    throw new ServiceUnavailableException(`Daily.co error ${created.status}: ${JSON.stringify(created.data)}`);
  }

  /** Address of a room: DAILY_DOMAIN when set, otherwise asked to Daily. */
  async roomUrl(name: string) {
    const domain = process.env.DAILY_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (domain && domain !== "xxx") return `https://${domain}/${name}`;
    const room = await this.call<Room>("GET", `/rooms/${encodeURIComponent(name)}`);
    if (!room.ok) throw new ServiceUnavailableException(`Daily.co error ${room.status}`);
    return room.data.url;
  }

  /** Rooms created before observers existed allowed 2 people: raise the limit when an admin joins. */
  async allowObserver(name: string) {
    const res = await this.call<Room>("POST", `/rooms/${encodeURIComponent(name)}`, { properties: { max_participants: MAX_PARTICIPANTS } });
    if (!res.ok) throw new ServiceUnavailableException(`Daily.co error ${res.status}`);
  }

  /**
   * Personal token for one room. `userId` lets the classroom tell people apart (an observer's starts
   * with "observer:"); an observer enters with camera and microphone off.
   */
  async meetingToken(p: { room: string; userName: string; isOwner: boolean; exp: Date; userId?: string; startOff?: boolean }) {
    const res = await this.call<{ token: string }>("POST", "/meeting-tokens", {
      properties: {
        room_name: p.room,
        user_name: p.userName,
        is_owner: p.isOwner,
        exp: Math.floor(p.exp.getTime() / 1000),
        ...(p.userId ? { user_id: p.userId } : {}),
        ...(p.startOff ? { start_video_off: true, start_audio_off: true } : {}),
      },
    });
    if (!res.ok) throw new ServiceUnavailableException(`Daily.co error ${res.status}: ${JSON.stringify(res.data)}`);
    return res.data;
  }
}
