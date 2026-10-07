import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherMaterials } from "./materials-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.materials");
  return { title: t("metaTitle") };
}

/** Documents the teacher shares with their students, after an admin approved them. */
export default function Page() {
  return <TeacherMaterials />;
}
