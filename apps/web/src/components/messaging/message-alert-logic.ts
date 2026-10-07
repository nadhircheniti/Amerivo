/** Shape of GET /messages/unread-count (apps/api messaging.service `unreadCount`). */
export type LatestUnread = {
  id: string;
  conversationId: string;
  kind: "text" | "file" | "homework";
  senderFirstName: string;
  /** Already screened by the API (contact details hidden), at most ~200 characters. */
  preview: string;
  createdAt: string;
};
export type UnreadSummary = { count: number; latest: LatestUnread | null };

/**
 * Newest message time already known to the user (ISO). `null` = nothing polled yet: the first
 * poll only sets the baseline, so messages that were waiting before the page opened are shown by
 * the badge, not announced again.
 */
export type AlertWatermark = string | null;

/**
 * Decides whether a poll result is a new message to announce, and moves the watermark.
 * - Announced only if it is newer than anything seen before (reading the newest message can
 *   reveal an older unread one: that one is not "new").
 * - Not announced while the user is on the messages screen (the conversation updates by itself),
 *   but the watermark still moves so it isn't announced later either.
 */
export function nextAlert(watermark: AlertWatermark, summary: UnreadSummary, onMessagesScreen: boolean): { announce: LatestUnread | null; watermark: string } {
  const latest = summary.latest;
  if (watermark === null) return { announce: null, watermark: latest?.createdAt ?? "" };
  if (!latest || latest.createdAt <= watermark) return { announce: null, watermark };
  return { announce: onMessagesScreen ? null : latest, watermark: latest.createdAt };
}

/** Accepts only a well-formed API answer (anything else is ignored rather than trusted). */
export function parseUnreadSummary(v: unknown): UnreadSummary | null {
  if (!v || typeof v !== "object") return null;
  const { count, latest } = v as { count?: unknown; latest?: unknown };
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return null;
  if (latest === null || latest === undefined) return { count: Math.trunc(count), latest: null };
  if (typeof latest !== "object") return null;
  const l = latest as Record<string, unknown>;
  const str = (k: string) => (typeof l[k] === "string" ? (l[k] as string) : null);
  const id = str("id");
  const conversationId = str("conversationId");
  const createdAt = str("createdAt");
  const kind = str("kind");
  if (!id || !conversationId || !createdAt || Number.isNaN(Date.parse(createdAt))) return null;
  return {
    count: Math.trunc(count),
    latest: {
      id,
      conversationId,
      kind: kind === "file" || kind === "homework" ? kind : "text",
      senderFirstName: (str("senderFirstName") ?? "").slice(0, 80),
      preview: (str("preview") ?? "").slice(0, 240),
      createdAt,
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Link that opens the conversation in the user's space (falls back to the inbox). */
export function conversationHref(space: "student" | "teacher", conversationId: string): string {
  return UUID.test(conversationId) ? `/${space}/messages?c=${conversationId}` : `/${space}/messages`;
}
