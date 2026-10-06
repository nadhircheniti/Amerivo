import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TestFlow } from "./_components/test-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.test");
  return { title: t("metaTitle") };
}

/** Adaptive level test (grammar, reading, listening, speaking). Can be skipped and taken later. */
export default function Page() {
  return <TestFlow />;
}
