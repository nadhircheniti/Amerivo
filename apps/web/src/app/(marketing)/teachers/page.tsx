import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getTeachers } from "@/lib/teachers";
import { TeacherSearch } from "./_components/teacher-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.search");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const tp = await getTranslations("marketing.profile");
  const { teachers } = await getTeachers({ headline: tp("fallbackHeadline"), city: tp("fallbackCity") });

  return (
    <div className="mx-auto max-w-[1440px] pb-20">
      <TeacherSearch key={query} initialQuery={query} teachers={teachers} />
    </div>
  );
}
