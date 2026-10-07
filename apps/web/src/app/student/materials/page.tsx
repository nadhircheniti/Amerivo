import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentMaterials } from "./materials-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.materials");
  return { title: t("title") };
}

/** Documents shared by the student's teachers (approved by an admin first). */
export default function Page() {
  return <StudentMaterials />;
}
