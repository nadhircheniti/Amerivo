import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { API_URL } from "@/lib/api";
import { DemoProfile, LiveProfile } from "./_components/profile-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.profile");
  return { title: t("metaTitle") };
}

/** "My public profile": what students see (photo, headline, bio, specialties, video…). */
export default function TeacherProfilePage() {
  return API_URL ? <LiveProfile /> : <DemoProfile />;
}
