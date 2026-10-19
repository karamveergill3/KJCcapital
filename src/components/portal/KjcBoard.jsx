"use client";

import { useEffect, useRef, useState } from "react";
import { direction, signedPercent } from "@/lib/kjc";
import { appendPoint, trendSeries, trendWindow } from "@/lib/trend";
import KjcTrend from "@/components/portal/KjcTrend";

const POLL_MS = 60000;
const ARROW = { up: "▲", down: "▼", flat: "▬" };

function timeOnly(iso) {
  if (!iso || !/T/.test(iso)) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })
    .format(new Date(iso));
}

// The board shows one figure, the percentage gain, quoted as $KJC, with a
// status light saying whether it is live, a snapshot or the example, and the
// trend of that figure underneath. When the feed is live it asks for the
// figure once a minute, flashes it when it moves and adds it to the end of the
// trend; a snapshot or the example never polls.
export default function KjcBoard({ mode, initial, trend, copy }) {
  const [state, setState] = useState(initial);
  const [series, setSeries] = useState(() => trendSeries(trend));
  const [flash, setFlash] = useState(null);
  const previous = useRef(initial.percent);
  // However long the page stays open, the trend keeps the span it opened with.
  const keep = useRef(trendWindow(series));

  useEffect(() => {
    if (mode !== "live") return undefined;
    let cancelled = false;
    let clear;
    const poll = async () => {
      try {
        const response = await fetch("/api/kjc", { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json();
        if (cancelled || !Number.isFinite(next?.percent)) return;
        const moved = Math.round((next.percent - previous.current) * 100);
        previous.current = next.percent;
        setState({ percent: next.percent, asAt: next.asAt });
        setSeries((current) => appendPoint(current, { at: next.asAt, kjc: next.percent }, keep.current));
        if (moved) {
          setFlash(moved > 0 ? "up" : "down");
          clearTimeout(clear);
          clear = setTimeout(() => !cancelled && setFlash(null), 1400);
        }
      } catch {
        // A missed poll leaves the last figure up; the next one tries again.
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(clear);
    };
  }, [mode]);

  const { percent, asAt } = state;
  const dir = direction(percent);
  const status =
    mode === "live"
      ? `${copy.statusLive} ${timeOnly(asAt)} UTC`
      : mode === "snapshot"
        ? `${copy.statusSnapshot} ${timeOnly(asAt)} UTC`
        : copy.statusExample;

  return (
    <section className="kjc-board" aria-label={copy.boardLabel}>
      <div className="shell kjc-body">
        <div className="kjc-label">
          <span className="kjc-symbol-lg">{copy.symbol}</span>
          <span className={`kjc-status kjc-status-${mode}`}>
            <span aria-hidden className="kjc-dot" />
            {status}
          </span>
        </div>
        <p className={`kjc-hero tone-${dir} ${flash ? `flash-${flash}` : ""}`}>
          <span aria-hidden className="kjc-hero-arrow">{ARROW[dir]}</span>
          {signedPercent(percent)}
        </p>
        {series.length > 1 ? <KjcTrend series={series} live={mode === "live"} summary={copy.trendSummary} /> : null}
      </div>
    </section>
  );
}
