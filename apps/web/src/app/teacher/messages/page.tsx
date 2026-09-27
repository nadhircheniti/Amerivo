import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.comingSoon");
  return { title: t("messagesTitle") };
}

export default function Page() {
  const t = useTranslations("teacher.comingSoon");
  return <ComingSoon title={t("messagesTitle")} description={t("messagesDescription")} icon="message" backHref="/teacher" backLabel={t("back")} />;
}
