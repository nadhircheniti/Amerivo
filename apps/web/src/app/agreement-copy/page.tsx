import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignedCopy } from "./signed-copy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company.teacherAgreement");
  return { title: t("copyTitle"), robots: { index: false } };
}

/** The teacher's signed copy, ready to print or save as PDF. */
export default function AgreementCopyPage() {
  return <SignedCopy />;
}
