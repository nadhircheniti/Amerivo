/** Shapes returned by the messaging API (apps/api/src/modules/messaging). */
export type ChatRole = "student" | "teacher";

export type ApiPerson = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: ChatRole | "admin";
  /** Teachers only: public profile slug. */
  teacherSlug?: string | null;
};

export type ApiMessage = {
  id: string;
  senderId: string;
  kind: "text" | "file" | "homework";
  body: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ApiConversation = {
  id: string;
  other: ApiPerson;
  lastMessage: Pick<ApiMessage, "body" | "kind" | "senderId" | "createdAt"> | null;
  unreadCount: number;
  lastMessageAt: string | null;
};

export type MessagePage = { items: ApiMessage[]; hasMore: boolean };

export type ApiNotification = { id: string; type: string; title: string; body: string | null; readAt: string | null; createdAt: string };

/** Where the messages view gets its data: the API (live) or in-memory samples (demo). */
export interface MessagingSource {
  list(): Promise<ApiConversation[]>;
  start(p: { teacherSlug: string } | { studentId: string }): Promise<{ id: string }>;
  page(conversationId: string, before?: string): Promise<MessagePage>;
  send(conversationId: string, body: string): Promise<ApiMessage>;
}
