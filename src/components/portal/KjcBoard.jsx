"use client";

import { useEffect, useRef, useState } from "react";
import { dateTime, direction, money, signedPercent } from "@/lib/kjc";
import { sparkLines, tapeItems } from "@/lib/kjcBoard";
import { fillTape, tapeDuration } from "@/lib/ticker";

const POLL_MS = 60000;
const ARROW = { up: "▲", down: "▼", flat: "▬" };

function timeOnly(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })
    .format(new Date(iso));
}

// The board is the quote a client checks first: a dark strip with a fixed
// $KJC badge and a moving tape, then the figure itself, large, with a
// sparkline and the numbers behind it. When the feed is live it asks for fresh
// figures once a minute and flashes whatever moved; a snapshot or the example
// never polls, and says which it is.
export default function KjcBoard({ mode, initial, history, copy }) {
  const [state, setState] = useState(initial);
  const [flash, setFlash] = useState({});
  const previous = useRef(initial.figures);

  useEffect(() => {
    if (mode !== "live") return undefined;
    let cancelled = false;
    let clear;
    const poll = async () => {
      try {
        const response = await fetch("/api/kjc", { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json();
        if (cancelled || !next?.figures) return;
        const before = previous.current;
        const moved = {};
        for (const key of ["percent", "net", "closed", "floating", "equity", "balance"]) {
          const delta = Math.round((next.figures[key] - before[key]) * 100);
          if (delta) moved[key] = delta > 0 ? "up" : "down";
        }
        previous.current = next.figures;
        setState({ figures: next.figures, asAt: next.asAt, currency: next.currency });
        setFlash(moved);
        clearTimeout(clear);
        clear = setTimeout(() => !cancelled && setFlash({}), 1400);
      } catch {
        // A missed poll leaves the last figures up; the next one tries again.
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(clear);
    };
  }, [mode]);

  const { figures: f, currency, asAt } = state;
  const dir = direction(f.percent);
  const items = tapeItems(f, currency, copy);
  const tape = fillTape(items, { minCharacters: 320 });
  const duration = tapeDuration(tape, { secondsPerCharacter: 0.16, minimum: 24 });
  const [closedLine, kjcLine] = sparkLines([history.closed, history.kjc], { w: 240, h: 64, pad: 4 });
  const status =
    mode === "live" ? `${copy.statusLive} ${timeOnly(asAt)} UTC` : mode === "snapshot" ? `${copy.statusSnapshot} ${timeOnly(asAt)} UTC` : copy.statusExample;

  const stats = [
    ["closed", copy.closed, money(f.closed, currency, { signed: true }), direction(f.closed)],
    ["floating", copy.floating, money(f.floating, currency, { signed: true }), direction(f.floating)],
    ["net", copy.net, money(f.net, currency, { signed: true }), direction(f.net)],
    ["equity", copy.equity, money(f.equity, currency), "flat"],
    ["balance", copy.balance, money(f.balance, currency), "flat"],
    ["capital", copy.capital, money(f.capital, currency), "flat"]
  ];

  return (
    <section className="kjc-board" aria-label={copy.boardLabel}>
      <div className="kjc-strip">
        <div className="kjc-badge">
          <span className="kjc-symbol">{copy.symbol}</span>
          <span className={`kjc-status kjc-status-${mode}`}>
            <span aria-hidden className="kjc-dot" />
            {status}
          </span>
        </div>
        <div className="kjc-tape" role="group" aria-label={copy.tapeLabel} style={{ "--kjc-duration": `${duration}s` }}>
          <div className="kjc-tape-track">
            {[0, 1].map((run) => (
              <ul key={run} className="kjc-tape-run" aria-hidden={run === 1 ? "true" : undefined}>
                {tape.map((item, i) => (
                  <li key={`${run}-${i}`} className={`kjc-tape-item tone-${item.tone}`}>
                    <span className="kjc-tape-term">{item.term}</span>
                    <span className={`kjc-tape-value ${flash[item.key] ? `flash-${flash[item.key]}` : ""}`}>
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>

      <div className="shell kjc-body">
        <div className="kjc-quote">
          <div className="kjc-label">
            <span className="kjc-symbol-lg">{copy.symbol}</span>
            <span>{copy.label}</span>
          </div>
          <p className={`kjc-hero tone-${dir} ${flash.percent ? `flash-${flash.percent}` : ""}`}>
            <span aria-hidden className="kjc-hero-arrow">{ARROW[dir]}</span>
            {signedPercent(f.percent)}
          </p>
          <p className="kjc-sub">
            {money(f.net, currency, { signed: true })} {copy.on} {money(f.capital, currency)} {copy.deposited}
          </p>
          <p className="kjc-explain">{copy.explain}</p>
        </div>

        <figure className="kjc-spark" aria-label={copy.sparkLabel}>
          {/* The lines stretch to the box; the dot is HTML so it stays round. */}
          <div className="kjc-spark-plot">
            <svg viewBox="0 0 240 64" width="100%" height="64" aria-hidden="true" preserveAspectRatio="none">
              {closedLine.d ? <path d={closedLine.d} className="kjc-spark-closed" /> : null}
              {kjcLine.d ? <path d={kjcLine.d} className="kjc-spark-kjc" /> : null}
            </svg>
            {kjcLine.last ? (
              <span
                aria-hidden
                className="kjc-spark-dot"
                style={{ left: `${(kjcLine.last.x / 240) * 100}%`, top: `${(kjcLine.last.y / 64) * 100}%` }}
              />
            ) : null}
          </div>
          <figcaption className="kjc-spark-key">
            <span><span aria-hidden className="kjc-key kjc-key-kjc" />{copy.symbol}</span>
            <span><span aria-hidden className="kjc-key kjc-key-closed" />{copy.closedReturn}</span>
          </figcaption>
        </figure>

        <dl className="kjc-stats">
          {stats.map(([key, term, value, tone]) => (
            <div key={key} className="kjc-stat">
              <dt>{term}</dt>
              <dd className={`tone-${tone} ${flash[key] ? `flash-${flash[key]}` : ""}`}>{value}</dd>
            </div>
          ))}
        </dl>

        <p className="kjc-asat">
          {copy.asAt} {asAt ? (mode === "example" ? asAt : dateTime(asAt)) : ""}, {copy.source[mode]}
        </p>
      </div>
    </section>
  );
}
