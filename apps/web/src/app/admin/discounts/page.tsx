import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DiscountsScreen } from "./discounts-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.discountsPage");
  return { title: t("metaTitle") };
}

/** One-time discount codes created by the admin team. */
export default function Page() {
  return <DiscountsScreen />;
}
