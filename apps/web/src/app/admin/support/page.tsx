import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SupportScreen } from "./_components/support-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.supportPage");
  return { title: t("metaTitle") };
}

/** Messages sent from the public contact form; admins answer them here (replies are e-mailed). */
export default function Page() {
  return <SupportScreen />;
}
