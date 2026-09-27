import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProgressView } from "./progress-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.progress");
  return { title: t("title") };
}

export default function StudentProgressPage() {
  return <ProgressView />;
}
