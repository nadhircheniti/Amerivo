import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgreementScreen } from "./agreement-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company.teacherAgreement");
  return { title: t("metaTitle") };
}

/** Teacher space: sign the agreement in force (required to use the space), or see the signed copy. */
export default function TeacherAgreementPage() {
  return <AgreementScreen />;
}
