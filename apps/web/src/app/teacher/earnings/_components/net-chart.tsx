import { useLocale, useTranslations } from "next-intl";
import { intlTags, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/mock-data";

const CHART_HEIGHT = 160; // px of the tallest bar

/** Bar chart of net earnings per month (month: yyyy-mm, value in USD). The last bar is the current month. */
export function NetChart({ months }: { months: { month: string; value: number; current?: boolean }[] }) {
  const t = useTranslations("teacher.earnings");
  const locale = useLocale() as Locale;
  const tag = intlTags[locale];
  const max = Math.max(1, ...months.map((m) => m.value));
  const fmt0 = (n: number) => formatUsd(n, locale).replace(/[.,]00(?!\d)/, "");
  const monthName = (ym: string, month: "short" | "long") => new Intl.DateTimeFormat(tag, { month, timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));
  if (!months.length) return null;
  return (
    <figure className="m-0">
      <ul
        className="flex h-[200px] items-end gap-3.5 border-b border-line-soft pb-0.5"
        aria-label={t("chartLabel", { from: monthName(months[0].month, "long"), to: monthName(months[months.length - 1].month, "long") })}
      >
        {months.map((m) => (
          <li key={m.month} className="flex grow basis-0 flex-col items-center gap-1.5">
            <span className={cn("text-[11px]", m.current ? "font-bold text-navy" : "text-muted")}>
              <span className="sr-only">{monthName(m.month, "long")}: </span>
              {fmt0(m.value)}
              {m.current && <span className="sr-only"> {t("currentMonth")}</span>}
            </span>
            <div
              className={cn("w-full rounded-t-md", m.current ? "bg-teal-dark" : "bg-teal-200")}
              style={{ height: Math.max(2, Math.round((m.value / max) * CHART_HEIGHT)) }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-3.5 text-xs text-muted" aria-hidden="true">
        {months.map((m) => (
          <span key={m.month} className={cn("grow basis-0 text-center", m.current && "font-bold text-navy")}>
            {monthName(m.month, "short")}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{t("chartCaption")}</figcaption>
    </figure>
  );
}
