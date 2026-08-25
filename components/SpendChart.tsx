import { formatMonth, formatMonthShort } from "@/lib/month";
import { formatMoney } from "@/lib/money";
import { chartCeiling, type MonthTotal } from "@/lib/summary";

/** Month-over-month spend. One series, so no legend — the heading says what is
 *  plotted. Only the tallest column is direct-labelled; the table underneath
 *  carries every other value, which is also what makes this readable without
 *  hover on a phone. */
export default function SpendChart({
  months,
  highlight,
}: {
  months: MonthTotal[];
  highlight?: string;
}) {
  const priced = months.filter((month) => month.total !== null);
  if (priced.length < 2) return null;

  const ceiling = chartCeiling(months.map((month) => month.total ?? 0));
  const peak = Math.max(...months.map((month) => month.total ?? 0));

  // A viewBox in abstract units keeps the SVG fluid; the wrapper sets height.
  const width = 100;
  const height = 46;
  const baseline = height - 8;
  const band = width / months.length;
  // 2px surface gap between adjacent columns, and never a full-width slot.
  const barWidth = Math.min(band - 2.5, 9);

  return (
    <figure className="m-0 flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full overflow-visible"
        role="img"
        aria-label={`Monthly spend from ${formatMonth(months[0].month)} to ${formatMonth(
          months[months.length - 1].month,
        )}`}
      >
        {/* Baseline only — a recessive hairline, no gridlines competing with
            eight columns on a narrow screen. */}
        <line
          x1="0"
          y1={baseline}
          x2={width}
          y2={baseline}
          stroke="var(--gf-border)"
          strokeWidth="0.3"
        />

        {months.map((month, index) => {
          const value = month.total ?? 0;
          const barHeight = ceiling === 0 ? 0 : (value / ceiling) * (baseline - 10);
          const x = index * band + (band - barWidth) / 2;
          const y = baseline - barHeight;
          const isPeak = value === peak && peak > 0;
          const isHighlight = month.month === highlight;

          return (
            <g key={month.month}>
              {/* Rounded data-end, square at the baseline: draw the rounded
                  rect then square off its foot. */}
              {barHeight > 0 ? (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="1.5"
                    fill="var(--gf-accent)"
                    opacity={isHighlight || !highlight ? 1 : 0.55}
                  />
                  <rect
                    x={x}
                    y={baseline - Math.min(barHeight, 2)}
                    width={barWidth}
                    height={Math.min(barHeight, 2)}
                    fill="var(--gf-accent)"
                    opacity={isHighlight || !highlight ? 1 : 0.55}
                  />
                </>
              ) : null}

              {/* Native tooltip on pointer devices; the table below is the
                  accessible route on touch. */}
              <title>{`${formatMonth(month.month)}: ${formatMoney(month.total)}`}</title>

              {isPeak ? (
                <text
                  x={x + barWidth / 2}
                  y={y - 2}
                  textAnchor="middle"
                  fontSize="3.4"
                  fill="var(--gf-text)"
                  className="font-semibold"
                >
                  {formatMoney(month.total)}
                </text>
              ) : null}

              <text
                x={x + barWidth / 2}
                y={height - 1.5}
                textAnchor="middle"
                fontSize="3.2"
                fill="var(--gf-muted)"
              >
                {formatMonthShort(month.month).split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
