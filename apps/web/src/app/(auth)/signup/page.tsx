import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthMain, OrDivider, SignupSteps } from "../_components/auth-ui";
import { SocialButtons } from "../_components/social-buttons";
import { SignupForm } from "./signup-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const isTeacher = async (searchParams: SearchParams) => {
  const { as } = await searchParams;
  return (Array.isArray(as) ? as[0] : as) === "teacher";
};

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: (await isTeacher(searchParams)) ? t("teacherMetaTitle") : t("metaTitle") };
}

/** Student sign-up (default) or teacher-applicant sign-up with `?as=teacher`. */
export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const teacher = await isTeacher(searchParams);
  const t = await getTranslations("auth.signup");
  const link = "font-semibold text-teal-dark hover:text-navy";
  return (
    <AuthMain
      topRight={
        <>
          {t("haveAccount")}{" "}
          <Link href={teacher ? "/login?redirect_url=%2Fteach%2Fapply" : "/login"} className={link}>
            {t("logIn")}
          </Link>
        </>
      }
    >
      <SignupSteps current={1} teacher={teacher} />
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[34px]">{teacher ? t("teacherTitle") : t("title")}</h1>
        <p className="text-base text-navy-soft">{teacher ? t("teacherSubtitle") : t("subtitle")}</p>
      </div>
      <SocialButtons mode="signup" role={teacher ? "teacher" : "student"} />
      <OrDivider />
      <SignupForm role={teacher ? "teacher" : "student"} />
      <p className="text-center text-sm text-muted">
        {teacher ? t("wantLearn") : t("wantTeach")}{" "}
        <Link href={teacher ? "/signup" : "/signup?as=teacher"} className={link}>
          {teacher ? t("studentAccount") : t("applyTeacher")}
        </Link>
      </p>
    </AuthMain>
  );
}
