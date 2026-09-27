import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DemoTeacherMessages, LiveMessages } from "@/components/messaging/messages-page";
import { API_URL } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.view");
  return { title: t("metaTitle") };
}

/** Live: real conversations with students (API). Demo mode: sample conversations. */
export default function TeacherMessagesPage() {
  if (!API_URL) return <DemoTeacherMessages />;
  return (
    <Suspense>
      <LiveMessages role="teacher" />
    </Suspense>
  );
}
