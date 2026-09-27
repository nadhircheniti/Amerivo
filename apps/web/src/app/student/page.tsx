import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardView } from "./_components/dashboard-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.overview");
  return { title: t("metaTitle") };
}

export default function StudentDashboardPage() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
