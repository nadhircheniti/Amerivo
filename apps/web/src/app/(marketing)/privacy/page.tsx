import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.pages");
  return { title: t("privacy.title") };
}

export default async function Page() {
  const t = await getTranslations("marketing.pages");
  return <ComingSoon title={t("privacy.title")} description={t("privacy.description")} icon="lock" backHref="/" backLabel={t("backHome")} />;
}
