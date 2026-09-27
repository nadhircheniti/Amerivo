import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthMain, OrDivider } from "../_components/auth-ui";
import { SocialButtons } from "../_components/social-buttons";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("metaTitle") };
}

export default function LoginPage() {
  const t = useTranslations("auth.login");
  return (
    <AuthMain
      topRight={
        <>
          {t("newHere")}{" "}
          <Link href="/signup" className="font-semibold text-teal-dark hover:text-navy">
            {t("createAccount")}
          </Link>
        </>
      }
    >
      <div className="flex w-full max-w-[560px] flex-col gap-[26px] lg:mt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t("title")}</h1>
          <p className="text-base text-navy-soft">{t("subtitle")}</p>
        </div>
        <SocialButtons mode="login" />
        <OrDivider />
        <LoginForm />
        <p className="text-center text-sm text-muted">
          {t("teacherQuestion")}{" "}
          <Link href="/teacher" className="font-semibold text-teal-dark hover:text-navy">
            {t("teacherLogin")}
          </Link>
        </p>
      </div>
    </AuthMain>
  );
}
