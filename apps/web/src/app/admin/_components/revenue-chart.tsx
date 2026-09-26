import { trend } from "../_data";

const W = 640;
const H = 220;
const PAD_Y = 16;

/** Simple two-series line chart (sample data, relative scale 0–100). */
export function RevenueChart() {
  const step = W / (trend.length - 1);
  const y = (v: number) => H - PAD_Y - (v / 100) * (H - PAD_Y * 2);
  const pts = (key: "revenue" | "lessons") => trend.map((d, i) => `${Math.round(i * step)},${Math.round(y(d[key]))}`).join(" ");
  const last = trend[trend.length - 1];
  const first = trend[0];

  return (
    <section aria-labelledby="trend-heading" className="flex min-w-0 flex-col gap-3 rounded-[20px] bg-white p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trend-heading" className="text-base font-bold">
          Revenue &amp; lessons <span className="ml-1 rounded-full bg-beige-2 px-2 py-0.5 align-middle font-sans text-[11px] font-semibold text-muted">Sample data</span>
        </h2>
        <ul className="flex gap-3.5 text-xs text-muted" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span className="h-[3px] w-3.5 bg-teal-dark" aria-hidden="true" />
            Revenue
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="14" height="3" aria-hidden="true" className="text-orange-dark">
              <path d="M0 1.5H5M8 1.5H14" stroke="currentColor" strokeWidth="3" />
            </svg>
            Lessons
          </li>
        </ul>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full"
        role="img"
        aria-label={`Revenue and lessons trend, sample data, ${first.month} to ${last.month}. Both series rise steadily: revenue index from ${first.revenue} to ${last.revenue}, lessons index from ${first.lessons} to ${last.lessons}.`}
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
      <div className="flex justify-between text-xs text-muted" aria-hidden="true">
        {trend.map((d) => (
          <span key={d.month}>{d.month}</span>
        ))}
      </div>
      <p className="text-xs text-muted">Relative scale (peak month = 100). Real figures appear once the analytics API is connected.</p>
    </section>
  );
}
