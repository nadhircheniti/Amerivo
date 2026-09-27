import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { AuthMain, SignupSteps } from "../_components/auth-ui";
import { ResendButton } from "./resend-button";
import { VerifyCodeForm } from "./code-form";
import { clerkEnabled } from "@/lib/auth-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify");
  return { title: t("metaTitle") };
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { email: raw } = await searchParams;
  const email = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  const t = await getTranslations("auth.verify");
  const strong = (c: React.ReactNode) => <strong className="text-navy">{c}</strong>;

  return (
    <AuthMain
      topRight={
        <>
          {t("wrongAddress")}{" "}
          <Link href="/signup" className="font-semibold text-teal-dark hover:text-navy">
            {t("changeEmail")}
          </Link>
        </>
      }
    >
      <SignupSteps current={2} />
      <div className="flex w-full max-w-[600px] flex-col gap-[26px] lg:mt-6">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-teal-100 text-teal-dark">
          <Icon name="message" size={36} strokeWidth={1.7} />
        </div>
        <div className="flex flex-col gap-3">
          <Badge tone="warning" className="self-start">
            <Icon name="clock" size={14} strokeWidth={2} />
            {t("pending")}
          </Badge>
          <h1 className="text-[28px] font-extrabold sm:text-[34px]">{t("title")}</h1>
          <p className="text-base leading-relaxed text-navy-soft">
            {clerkEnabled ? (email ? t.rich("sentCode", { email, strong }) : t("sentCodeNoEmail")) : email ? t.rich("sentLink", { email, strong }) : t("sentLinkNoEmail")}
          </p>
        </div>
        <ul className="flex flex-col gap-2 rounded-2xl bg-beige p-5 text-[15px] text-navy-soft">
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={16} strokeWidth={2.4} className="mt-1 shrink-0 text-teal-dark" />
            {clerkEnabled ? t("codeExpires") : t("linkExpires")}
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={16} strokeWidth={2.4} className="mt-1 shrink-0 text-teal-dark" />
            {t("spam")}
          </li>
        </ul>
        {clerkEnabled ? (
          <VerifyCodeForm />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <ButtonLink href="/onboarding/goals" variant="teal" size="lg" className="font-bold">
              {t("verifiedContinue")}
              <Icon name="arrowRight" size={18} strokeWidth={2} />
            </ButtonLink>
            <ResendButton />
          </div>
        )}
      </div>
    </AuthMain>
  );
}
