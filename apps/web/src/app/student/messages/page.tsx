import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessagesView } from "./messages-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.messages");
  return { title: t("metaTitle") };
}

export default function StudentMessagesPage() {
  return <MessagesView />;
}
