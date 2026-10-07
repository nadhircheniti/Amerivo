import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ModerationScreen } from "./moderation-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.moderationPage");
  return { title: t("metaTitle") };
}

/** Trust & safety queue: contact details detected in messages, classroom chat, notes, reports and reviews. */
export default function Page() {
  return <ModerationScreen />;
}
