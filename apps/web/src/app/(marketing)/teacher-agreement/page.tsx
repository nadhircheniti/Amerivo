import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { agreementProse, type AgreementText } from "@/components/legal/teacher-agreement";
import { API_URL } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("company.teacherAgreement");
  return { title: t("metaTitle") };
}

/** Public text of the Independent Teacher Agreement (read before applying; signed in the application). */
export default async function TeacherAgreementPage() {
  const t = await getTranslations("company.teacherAgreement");
  let text: AgreementText | null = null;
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/legal/teacher-agreement`, { next: { revalidate: 300 } });
      if (res.ok) text = (await res.json()) as AgreementText;
    } catch {
      text = null;
    }
  }
  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-6 py-12 lg:py-16">
      <p className="rounded-2xl bg-teal-100 px-5 py-4 text-sm leading-relaxed text-teal-deep">{t("publicNote")}</p>
      {text ? (
        <>
          {/* Built by the API from the agreement's text, every character escaped. */}
          <article className={`rounded-3xl bg-white p-6 sm:p-10 ${agreementProse}`} dangerouslySetInnerHTML={{ __html: text.html }} />
          <p className="text-[13px] text-muted">
            {t("version", { version: text.version })} · SHA-256 {text.sha256}
          </p>
        </>
      ) : (
        <p className="rounded-2xl bg-white px-5 py-4 text-sm text-navy-soft">{t("loadError")}</p>
      )}
    </div>
  );
}
