"use client";

import { useMemo, useState } from "react";
import { signedPercent } from "@/lib/kjc";
import { areaPath, nearestIndex, pointLabel, trendPath, trendScale } from "@/lib/trend";

// The SVG is stretched to the plot, so the line is drawn in a fixed box and
// kept at 2px by non-scaling strokes. Anything round (the dots, the pills) or
// dotted (the gridlines) is HTML placed by percentage, because a stretched SVG
// circle becomes an ellipse and a stretched dash pattern smears.
const W = 1000;
const H = 100;

// A y label closer than this to the latest figure's pill (as a percentage of
// the plot's height) would run into it, so it is left out.
const CLEAR = 9;

const edge = (x, near) => (x < near ? "at-start" : x > 100 - near ? "at-end" : "");

// The opening figure's pill goes above or below the first reading, on the
// side the line wanders into least over the first stretch of the plot.
function openingSide(points, scale) {
  const y0 = scale.y(points[0].kjc);
  if (y0 < 18) return "below";
  if (y0 > 82) return "above";
  const near = points.filter((p) => scale.x(p.at) <= 16).map((p) => scale.y(p.kjc));
  const rise = y0 - Math.min(...near);
  const fall = Math.max(...near) - y0;
  return rise > fall ? "below" : "above";
}

// Drawn like a price chart: green when the range ends at or above where it
// began, red when below, with the opening figure in a pill by the first
// reading and the latest one in a pill of its own colour on the axis.
export default function KjcTrend({ points, live, summary }) {
  const scale = useMemo(() => trendScale(points), [points]);
  const [active, setActive] = useState(null);

  const first = points[0];
  const last = points[points.length - 1];
  const tone = last.kjc >= first.kjc ? "is-gain" : "is-loss";
  const lastY = scale.y(last.kjc);
  const point = active === null ? null : points[Math.min(active, points.length - 1)];
  const pointX = point ? scale.x(point.at) : 0;

  const track = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    setActive(nearestIndex(points, scale, ((event.clientX - box.left) / box.width) * 100));
  };

  const values = points.map((p) => p.kjc);
  const label = summary
    .replace("{from}", pointLabel(first.at, scale.spanMs))
    .replace("{to}", pointLabel(last.at, scale.spanMs))
    .replace("{low}", signedPercent(Math.min(...values)))
    .replace("{high}", signedPercent(Math.max(...values)))
    .replace("{latest}", signedPercent(last.kjc));

  return (
    <figure className={`kjc-trend ${tone}`}>
      <div
        className="kjc-trend-plot"
        role="img"
        aria-label={label}
        onPointerMove={track}
        onPointerDown={track}
        onPointerLeave={() => setActive(null)}
      >
        <div className="kjc-trend-grid" aria-hidden>
          {scale.yTicks.map((v) => (
            <span key={v} style={{ top: `${scale.y(v)}%` }} />
          ))}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="kjc-trend-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath(points, scale, W, H)} fill="url(#kjc-trend-wash)" />
          <path className="kjc-trend-line" d={trendPath(points, scale, W, H)} vectorEffect="non-scaling-stroke" />
        </svg>

        <span aria-hidden className="kjc-trend-start" style={{ left: `${scale.x(first.at)}%`, top: `${scale.y(first.kjc)}%` }} />
        <span
          aria-hidden
          className={`kjc-trend-open is-${openingSide(points, scale)}`}
          style={{ left: `${scale.x(first.at)}%`, top: `${scale.y(first.kjc)}%` }}
        >
          {signedPercent(first.kjc)}
        </span>

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
          style={{ left: `${scale.x(last.at)}%`, top: `${lastY}%` }}
        />
      </div>

      <div className="kjc-trend-y" aria-hidden>
        {scale.yTicks
          .filter((v) => Math.abs(scale.y(v) - lastY) >= CLEAR)
          .map((v) => (
            <span key={v} style={{ top: `${scale.y(v)}%` }}>
              {signedPercent(v, scale.yDigits)}
            </span>
          ))}
        <span className="kjc-trend-last" style={{ top: `${lastY}%` }}>
          {signedPercent(last.kjc)}
        </span>
      </div>

      <div className="kjc-trend-x" aria-hidden>
        {scale.xTicks.map((tick) => (
          <span key={tick.t} className={edge(tick.x, 6)} style={{ left: `${tick.x}%` }}>
            {tick.year ? (
              <>
                {tick.name}
                <span className="kjc-trend-year"> {tick.year}</span>
              </>
            ) : (
              tick.label
            )}
          </span>
        ))}
      </div>
    </figure>
  );
}
