import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveLessonsScreen } from "./live-lessons-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.liveLessonsPage");
  return { title: t("metaTitle") };
}

/** Lessons happening now: an admin can join one as a visible quality observer (Terms §7). */
export default function Page() {
  return <LiveLessonsScreen />;
}
