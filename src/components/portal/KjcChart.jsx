"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { signedPercent } from "@/lib/kjc";

// Emphasis, not a palette: $KJC is the story, in the site's gold; closed profit
// is context, in grey. One axis, both in percent of deposits. Thin lines,
// hairline grid, a crosshair that snaps to the day and reads out both lines.
const KJC = "#7a5a1c";
const CLOSED = "#a19d92";
const GRID = "#ebe4d1";
const AXIS = "#6b6a63";
const ZERO = "#b8b09a";
const SURFACE = "#fdfbf5";

function Readout({ active, payload, label, names }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const rows = [
    ["kjc", KJC, names.kjc],
    ["closed", CLOSED, names.closed]
  ].filter(([key]) => point[key] !== null && point[key] !== undefined);
  return (
    <div className="border border-[var(--color-rule)] bg-[var(--color-paper-white)] px-3 py-2 shadow-sm">
      {rows.map(([key, color, name]) => (
        <div key={key} className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-[2px] w-3" style={{ background: color }} />
          <span className="font-sans text-sm font-semibold text-[var(--color-ink)]">{signedPercent(point[key])}</span>
          <span className="font-sans text-xs text-[var(--color-ink-mute)]">{name}</span>
        </div>
      ))}
      <div className="font-sans text-xs text-[var(--color-ink-mute)] mt-1">{label}</div>
    </div>
  );
}

function Key({ color, children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="inline-block h-[2px] w-4" style={{ background: color }} />
      {children}
    </span>
  );
}

export default function KjcChart({ points, names, label }) {
  // A single equity sample draws no line, so it gets a dot to be seen at all.
  const kjcPoints = points.filter((p) => p.kjc !== null).length;
  return (
    <figure className="m-0" aria-label={label}>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 font-sans text-sm text-[var(--color-ink-soft)]">
        <Key color={KJC}>{names.kjc}</Key>
        <Key color={CLOSED}>{names.closed}</Key>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{ fill: AXIS, fontSize: 11, fontFamily: "var(--font-sans)" }}
              interval="preserveStartEnd"
              minTickGap={28}
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
            <Tooltip content={<Readout names={names} />} cursor={{ stroke: AXIS, strokeWidth: 1 }} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="closed"
              stroke={CLOSED}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CLOSED, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="kjc"
              stroke={KJC}
              strokeWidth={2}
              connectNulls={false}
              dot={kjcPoints === 1 ? { r: 5, fill: KJC, stroke: SURFACE, strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: KJC, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
