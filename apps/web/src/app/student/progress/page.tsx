import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.comingSoon.progress");
  return { title: t("title") };
}

export default function Page() {
  const t = useTranslations("student");
  return (
    <ComingSoon
      title={t("comingSoon.progress.title")}
      description={t("comingSoon.progress.description")}
      icon="chart"
      backHref="/student"
      backLabel={t("backToOverview")}
    />
  );
}
