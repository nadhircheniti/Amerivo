import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaymentsScreen } from "./_components/payments-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.paymentsPage");
  return { title: t("metaTitle") };
}

/** Live mode reads the API; demo mode (no API) shows sample data with actions disabled. */
export default function Page() {
  return <PaymentsScreen />;
}
