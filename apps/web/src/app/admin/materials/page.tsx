import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MaterialsScreen } from "./materials-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.materialsPage");
  return { title: t("metaTitle") };
}

/** Documents teachers want to share with their students: checked and approved here first. */
export default function Page() {
  return <MaterialsScreen />;
}
