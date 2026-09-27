import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.comingSoon.homework");
  return { title: t("title") };
}

export default function Page() {
  const t = useTranslations("student");
  return <ComingSoon title={t("comingSoon.homework.title")} description={t("comingSoon.homework.description")} icon="book" backHref="/student" backLabel={t("backToOverview")} />;
}
