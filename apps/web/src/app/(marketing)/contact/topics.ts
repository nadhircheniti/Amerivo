/** Contact form topics (same list as the API's SUPPORT_TOPICS). Shared by the server page and the client form. */
export const TOPICS = ["general", "student", "teacher", "billing", "business", "technical"] as const;
export type Topic = (typeof TOPICS)[number];
