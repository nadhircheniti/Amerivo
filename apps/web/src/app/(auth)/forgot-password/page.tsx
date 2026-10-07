import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthMain } from "../_components/auth-ui";
import { ResetPasswordForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("metaTitle") };
}

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgot");
  return (
    <AuthMain
      topRight={
        <Link href="/login" className="font-semibold text-teal-dark hover:text-navy">
          {t("backToLogin")}
        </Link>
      }
    >
      <div className="flex w-full max-w-[560px] flex-col gap-[26px] lg:mt-10">
        <ResetPasswordForm />
      </div>
    </AuthMain>
  );
}
