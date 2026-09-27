"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/use-api";
import type { ApiConversation, ApiMessage, MessagePage, MessagingSource } from "./types";

/** Live data: the messaging API. */
export function useApiMessagingSource(): MessagingSource {
  const { call } = useApi();
  return useMemo<MessagingSource>(
    () => ({
      list: () => call<ApiConversation[]>("/conversations"),
      start: (p) => call<{ id: string }>("/conversations", { method: "POST", body: JSON.stringify(p) }),
      page: (id, before) => {
        const q = new URLSearchParams({ limit: "50" });
        if (before) q.set("before", before);
        return call<MessagePage>(`/conversations/${id}/messages?${q}`);
      },
      send: (id, body) => call<ApiMessage>(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
    }),
    [call],
  );
}

/* ------------------------------------------------------------------ demo (no API) */

const DEMO_ME = "demo-teacher";
const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const person = (id: string, firstName: string, lastName: string) => ({ id, firstName, lastName, avatarUrl: null, role: "student" as const });

/** Sample student conversations for the teacher space in demo mode (content stays in English). */
function teacherSamples(): { conv: ApiConversation; thread: ApiMessage[] }[] {
  const msg = (id: string, senderId: string, body: string, createdAt: string, read = true): ApiMessage => ({ id, senderId, kind: "text", body, readAt: read ? createdAt : null, createdAt });
  const maria = person("demo-maria", "Maria", "Garcia");
  const kenji = person("demo-kenji", "Kenji", "Tanaka");
  const layla = person("demo-layla", "Layla", "Haddad");
  const threads = [
    {
      other: maria,
      thread: [
        msg("m1", DEMO_ME, "Hi Maria! For today's lesson we'll practice leading a team meeting. Could you look at the agenda template before class?", at(0, 9, 12)),
        msg("m2", maria.id, "Thanks! I read it. I also finished the homework from last week.", at(0, 17, 40), false),
      ],
    },
    {
      other: kenji,
      thread: [
        msg("k1", kenji.id, "Could we focus on interview questions next time?", at(2, 18, 5)),
        msg("k2", DEMO_ME, "Of course — bring the job description and we'll prepare your answers together.", at(2, 19, 30)),
      ],
    },
    { other: layla, thread: [msg("l1", layla.id, "Thank you for the trial lesson! I booked a pack of 5.", at(6, 11, 0))] },
  ];
  return threads.map(({ other, thread }) => {
    const last = thread[thread.length - 1];
    return {
      conv: {
        id: `demo-${other.id}`,
        other,
        lastMessage: { body: last.body, kind: last.kind, senderId: last.senderId, createdAt: last.createdAt },
        unreadCount: thread.filter((m) => m.senderId !== DEMO_ME && !m.readAt).length,
        lastMessageAt: last.createdAt,
      },
      thread,
    };
  });
}

/** In-memory source so the teacher messages screen can be reviewed without the API. */
export function createDemoTeacherSource(): MessagingSource {
  const data = teacherSamples();
  const find = (id: string) => data.find((d) => d.conv.id === id);
  return {
    list: async () => data.map((d) => ({ ...d.conv })),
    start: async (p) => {
      const d = "studentId" in p ? data.find((x) => x.conv.other.id === p.studentId) : undefined;
      return { id: (d ?? data[0]).conv.id };
    },
    page: async (id) => {
      const d = find(id);
      if (!d) return { items: [], hasMore: false };
      d.thread.forEach((m) => (m.readAt ??= new Date().toISOString()));
      d.conv.unreadCount = 0;
      return { items: [...d.thread], hasMore: false };
    },
    send: async (id, body) => {
      const d = find(id);
      const m: ApiMessage = { id: `demo-${Date.now()}`, senderId: DEMO_ME, kind: "text", body, readAt: null, createdAt: new Date().toISOString() };
      if (d) {
        d.thread.push(m);
        d.conv.lastMessage = { body, kind: "text", senderId: DEMO_ME, createdAt: m.createdAt };
        d.conv.lastMessageAt = m.createdAt;
      }
      return m;
    },
  };
}
