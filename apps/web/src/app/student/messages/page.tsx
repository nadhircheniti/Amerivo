import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LiveMessages } from "@/components/messaging/messages-page";
import { API_URL } from "@/lib/api";
import { MessagesView } from "./messages-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.view");
  return { title: t("metaTitle") };
}

/** Live: real conversations (API). Demo mode: the sample design on mock data. */
export default function StudentMessagesPage() {
  if (!API_URL) return <MessagesView />;
  return (
    <Suspense>
      <LiveMessages role="student" />
    </Suspense>
  );
}
