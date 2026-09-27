import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthMain, OrDivider, SignupSteps } from "../_components/auth-ui";
import { SocialButtons } from "../_components/social-buttons";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: t("metaTitle") };
}

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  return (
    <AuthMain
      topRight={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-teal-dark hover:text-navy">
            {t("logIn")}
          </Link>
        </>
      }
    >
      <SignupSteps current={1} />
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t("title")}</h1>
        <p className="text-base text-navy-soft">{t("subtitle")}</p>
      </div>
      <SocialButtons mode="signup" />
      <OrDivider />
      <SignupForm />
      <p className="text-center text-sm text-muted">
        {t("wantTeach")}{" "}
        <Link href="/teach/apply" className="font-semibold text-teal-dark hover:text-navy">
          {t("applyTeacher")}
        </Link>
      </p>
    </AuthMain>
  );
}
