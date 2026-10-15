"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { TeacherAgreementPanel } from "@/components/legal/teacher-agreement";

export function AgreementScreen() {
  const t = useTranslations("company.teacherAgreement");
  const router = useRouter();
  return (
    <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-[30px]">{t("title")}</h1>
        <p className="mt-1 max-w-[760px] text-[15px] text-muted">{t("spaceIntro")}</p>
      </header>
      <section className="max-w-[900px] rounded-3xl bg-white p-5 sm:p-8">
        <TeacherAgreementPanel onSigned={() => router.refresh()} />
      </section>
    </div>
  );
}
