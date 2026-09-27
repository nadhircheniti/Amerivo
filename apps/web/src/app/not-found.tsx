import { useTranslations } from "next-intl";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <div className="min-h-screen bg-beige">
      <ComingSoon title={t("title")} description={t("description")} icon="search" backHref="/" backLabel={t("back")} />
    </div>
  );
}
