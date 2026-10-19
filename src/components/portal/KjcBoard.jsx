"use client";

import { useEffect, useRef, useState } from "react";
import { direction, signedPercent } from "@/lib/kjc";
import { appendToRanges, defaultRange } from "@/lib/trend";
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
// trend of that figure underneath in ranges, a day to the whole life of the
// account, picked from a row of tabs as on a stock app. When the feed is live
// it asks for the figure once a minute, flashes it when it moves and adds it
// to the end of every range, each of which keeps only its own window; a
// snapshot or the example never polls.
export default function KjcBoard({ mode, initial, ranges, copy }) {
  const [state, setState] = useState(initial);
  const [lines, setLines] = useState(() => (Array.isArray(ranges) ? ranges : []));
  const [selected, setSelected] = useState(() => defaultRange(lines));
  const [flash, setFlash] = useState(null);
  const previous = useRef(initial.percent);

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
        setLines((current) => appendToRanges(current, { at: next.asAt, kjc: next.percent }));
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
  const shown = lines.find((r) => r.key === selected && r.enabled) ?? lines.find((r) => r.key === defaultRange(lines));

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
        {shown?.enabled ? (
          <div className="kjc-chart">
            <div className="kjc-ranges" role="group" aria-label={copy.rangeLabel}>
              {lines.map((range) => (
                <button
                  key={range.key}
                  type="button"
                  className="kjc-range"
                  aria-pressed={range.key === shown.key}
                  disabled={!range.enabled}
                  onClick={() => setSelected(range.key)}
                >
                  {range.key}
                </button>
              ))}
            </div>
            <KjcTrend key={shown.key} points={shown.points} live={mode === "live"} summary={copy.trendSummary} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
