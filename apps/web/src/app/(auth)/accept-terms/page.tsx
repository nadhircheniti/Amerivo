import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthMain } from "../_components/auth-ui";
import { AcceptTermsForm } from "./accept-terms-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.acceptTerms");
  return { title: t("metaTitle") };
}

/** Shown to a signed-in student or teacher who hasn't accepted the current Terms of Service. */
export default function AcceptTermsPage() {
  return (
    <AuthMain>
      <AcceptTermsForm />
    </AuthMain>
  );
}
