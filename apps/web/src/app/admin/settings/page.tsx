import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.comingSoon");
  return { title: t("settingsTitle") };
}

export default function Page() {
  const t = useTranslations("admin.comingSoon");
  return <ComingSoon title={t("settingsTitle")} description={t("settingsDescription")} icon="settings" backHref="/admin" backLabel={t("back")} />;
}
