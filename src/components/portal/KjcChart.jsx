"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { signedPercent } from "@/lib/kjc";

// One series, so no legend: the section title names it. Thin line, a 10% wash
// under it, hairline grid, one axis, and a crosshair that snaps to the month.
const LINE = "#7a5a1c";
const WASH = "#a37e2c";
const GRID = "#ebe4d1";
const AXIS = "#6b6a63";
const ZERO = "#b8b09a";
const SURFACE = "#fdfbf5";

function QuoteTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="border border-[var(--color-rule)] bg-[var(--color-paper-white)] px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-[2px] w-3" style={{ background: LINE }} />
        <span className="font-sans text-sm font-semibold text-[var(--color-ink)]">
          {signedPercent(point.percent)}
        </span>
      </div>
      <div className="font-sans text-xs text-[var(--color-ink-mute)] mt-0.5">{point.month}</div>
    </div>
  );
}

export default function KjcChart({ points, label }) {
  return (
    <figure className="m-0" aria-label={label}>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{ fill: AXIS, fontSize: 11, fontFamily: "var(--font-sans)" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS, fontSize: 11, fontFamily: "var(--font-sans)" }}
              tickFormatter={(v) => signedPercent(v, 0)}
              allowDecimals={false}
            />
            <ReferenceLine y={0} stroke={ZERO} strokeWidth={1} />
            <Tooltip
              content={<QuoteTooltip />}
              cursor={{ stroke: AXIS, strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="percent"
              stroke={LINE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={WASH}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 5, fill: LINE, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
