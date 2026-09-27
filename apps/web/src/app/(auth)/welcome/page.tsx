import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthMain } from "../_components/auth-ui";
import { WelcomeFlow } from "./welcome-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.welcome");
  return { title: t("metaTitle") };
}

export default function WelcomePage() {
  return (
    <AuthMain>
      <WelcomeFlow />
    </AuthMain>
  );
}
