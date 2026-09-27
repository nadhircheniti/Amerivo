import { useLocale, useTranslations } from "next-intl";
import { intlTags } from "@/i18n/config";
import { trend } from "../_data";

const W = 640;
const H = 220;
const PAD_Y = 16;

type Point = { key: string; date: Date; revenue: number; lessons: number };

/**
 * Simple two-series line chart. Without `months` it shows the sample series (relative scale 0–100);
 * with `months` (live API, last 12 months) each series is scaled to its own peak.
 */
export function RevenueChart({ months, formatMoney }: { months?: { month: string; revenueCents: number; lessons: number }[]; formatMoney?: (cents: number) => string }) {
  const t = useTranslations("admin.chart");
  const locale = useLocale();
  const live = !!months;
  const monthFmt = new Intl.DateTimeFormat(intlTags[locale], { month: "short", timeZone: "UTC" });
  const data: Point[] = months
    ? months.map((m) => ({ key: m.month, date: new Date(`${m.month}-01T00:00:00Z`), revenue: m.revenueCents, lessons: m.lessons }))
    : trend.map((d) => ({ key: String(d.month), date: new Date(Date.UTC(2026, d.month - 1, 1)), revenue: d.revenue, lessons: d.lessons }));
  const month = (d: Point) => monthFmt.format(d.date);
  const peak = { revenue: Math.max(1, ...data.map((d) => d.revenue)), lessons: Math.max(1, ...data.map((d) => d.lessons)) };
  const scale = (key: "revenue" | "lessons", v: number) => (live ? (v / peak[key]) * 100 : v);
  const step = W / Math.max(1, data.length - 1);
  const y = (v: number) => H - PAD_Y - (v / 100) * (H - PAD_Y * 2);
  const pts = (key: "revenue" | "lessons") => data.map((d, i) => `${Math.round(i * step)},${Math.round(y(scale(key, d[key])))}`).join(" ");
  const last = data[data.length - 1];
  const first = data[0];
  const money = formatMoney ?? ((c: number) => String(c));
  const total = { revenue: data.reduce((a, d) => a + d.revenue, 0), lessons: data.reduce((a, d) => a + d.lessons, 0) };

  return (
    <section aria-labelledby="trend-heading" className="flex min-w-0 flex-col gap-3 rounded-[20px] bg-white p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trend-heading" className="text-base font-bold">
          {t("title")}{" "}
          <span className="ms-1 rounded-full bg-beige-2 px-2 py-0.5 align-middle font-sans text-[11px] font-semibold text-muted">{live ? t("last12") : t("sample")}</span>
        </h2>
        <ul className="flex gap-3.5 text-xs text-muted" aria-label={t("legend")}>
          <li className="flex items-center gap-1.5">
            <span className="h-[3px] w-3.5 bg-teal-dark" aria-hidden="true" />
            {t("revenue")}
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="14" height="3" aria-hidden="true" className="text-orange-dark">
              <path d="M0 1.5H5M8 1.5H14" stroke="currentColor" strokeWidth="3" />
            </svg>
            {t("lessons")}
          </li>
        </ul>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full"
        role="img"
        aria-label={
          live
            ? t("ariaLive", {
                from: month(first),
                to: month(last),
                revenue: money(total.revenue),
                lessons: total.lessons,
                revenueLast: money(last.revenue),
                lessonsLast: last.lessons,
              })
            : t("aria", {
                from: month(first),
                to: month(last),
                revenueFrom: first.revenue,
                revenueTo: last.revenue,
                lessonsFrom: first.lessons,
                lessonsTo: last.lessons,
              })
        }
      >
        <path d={`M0 ${H / 4}H${W}M0 ${H / 2}H${W}M0 ${(H * 3) / 4}H${W}`} className="stroke-line-soft" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <polyline points={pts("revenue")} fill="none" className="stroke-teal-dark" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <polyline
          points={pts("lessons")}
          fill="none"
          className="stroke-orange-dark"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Months follow the chart's left-to-right time axis, also in right-to-left languages. */}
      <div dir="ltr" className="flex justify-between text-xs text-muted" aria-hidden="true">
        {data.map((d) => (
          <span key={d.key}>{month(d)}</span>
        ))}
      </div>
      <p className="text-xs text-muted">{live ? t("noteLive", { revenue: money(total.revenue), lessons: total.lessons }) : t("note")}</p>
    </section>
  );
}
