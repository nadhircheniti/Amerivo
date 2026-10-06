import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResultsView } from "./_components/results-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.results");
  return { title: t("metaTitle") };
}

/** Level result (measured or estimated), corrections of the test and recommended teachers. */
export default function ResultsPage() {
  return <ResultsView />;
}
