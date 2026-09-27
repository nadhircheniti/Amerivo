import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.comingSoon.settings");
  return { title: t("title") };
}

export default function Page() {
  const t = useTranslations("student");
  return (
    <ComingSoon title={t("comingSoon.settings.title")} description={t("comingSoon.settings.description")} icon="settings" backHref="/student" backLabel={t("backToOverview")} />
  );
}
