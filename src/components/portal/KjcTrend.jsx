"use client";

import { useMemo, useState } from "react";
import { signedPercent } from "@/lib/kjc";
import { areaPath, nearestIndex, pointLabel, trendPath, trendScale } from "@/lib/trend";

// The SVG is stretched to the plot, so the line is drawn in a fixed box and
// kept at 2px by non-scaling strokes. Anything round (the dots) is HTML placed
// by percentage, because a stretched SVG circle becomes an ellipse.
const W = 1000;
const H = 100;

const edge = (x, near) => (x < near ? "at-start" : x > 100 - near ? "at-end" : "");

export default function KjcTrend({ series, live, summary }) {
  const scale = useMemo(() => trendScale(series), [series]);
  const [active, setActive] = useState(null);

  const last = series[series.length - 1];
  const point = active === null ? null : series[Math.min(active, series.length - 1)];
  const pointX = point ? scale.x(point.at) : 0;

  const track = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    setActive(nearestIndex(series, scale, ((event.clientX - box.left) / box.width) * 100));
  };

  const values = series.map((p) => p.kjc);
  const label = summary
    .replace("{from}", pointLabel(series[0].at, scale.spanMs))
    .replace("{to}", pointLabel(last.at, scale.spanMs))
    .replace("{low}", signedPercent(Math.min(...values)))
    .replace("{high}", signedPercent(Math.max(...values)))
    .replace("{latest}", signedPercent(last.kjc));

  return (
    <figure className="kjc-trend">
      <div
        className="kjc-trend-plot"
        role="img"
        aria-label={label}
        onPointerMove={track}
        onPointerDown={track}
        onPointerLeave={() => setActive(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="kjc-trend-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.24" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {scale.yTicks.map((v) => (
            <line
              key={v}
              className="kjc-trend-gridline"
              x1="0"
              x2={W}
              y1={(scale.y(v) * H) / 100}
              y2={(scale.y(v) * H) / 100}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={areaPath(series, scale, W, H)} fill="url(#kjc-trend-wash)" />
          <path className="kjc-trend-line" d={trendPath(series, scale, W, H)} vectorEffect="non-scaling-stroke" />
        </svg>

        {point ? (
          <>
            <span aria-hidden className="kjc-trend-cross" style={{ left: `${pointX}%` }} />
            <span
              aria-hidden
              className="kjc-trend-mark"
              style={{ left: `${pointX}%`, top: `${scale.y(point.kjc)}%` }}
            />
            <span aria-hidden className={`kjc-trend-readout ${edge(pointX, 14)}`} style={{ left: `${pointX}%` }}>
              <span className="kjc-trend-readout-at">{pointLabel(point.at, scale.spanMs)}</span>
              {signedPercent(point.kjc)}
            </span>
          </>
        ) : null}

        <span
          aria-hidden
          className={`kjc-trend-dot ${live ? "is-live" : ""}`}
          style={{ left: `${scale.x(last.at)}%`, top: `${scale.y(last.kjc)}%` }}
        />
      </div>

      <div className="kjc-trend-y" aria-hidden>
        {scale.yTicks.map((v) => (
          <span key={v} style={{ top: `${scale.y(v)}%` }}>
            {signedPercent(v, scale.yDigits)}
          </span>
        ))}
      </div>

      <div className="kjc-trend-x" aria-hidden>
        {scale.xTicks.map((tick) => (
          <span key={tick.t} className={edge(tick.x, 6)} style={{ left: `${tick.x}%` }}>
            {tick.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
