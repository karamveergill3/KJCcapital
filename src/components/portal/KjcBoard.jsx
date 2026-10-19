"use client";

import { useEffect, useRef, useState } from "react";
import { direction, signedPercent } from "@/lib/kjc";
import { tapeItems } from "@/lib/kjcBoard";
import { fillTape, tapeDuration } from "@/lib/ticker";

const POLL_MS = 60000;
const ARROW = { up: "▲", down: "▼", flat: "▬" };

function timeOnly(iso) {
  if (!iso || !/T/.test(iso)) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })
    .format(new Date(iso));
}

// The board shows one figure, the percentage gain, quoted as $KJC: a dark
// strip with a fixed badge and a moving tape, then the figure itself, large.
// When the feed is live it asks for the figure once a minute and flashes it
// when it moves; a snapshot or the example never polls, and says which it is.
export default function KjcBoard({ mode, initial, copy }) {
  const [state, setState] = useState(initial);
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
  const tape = fillTape(tapeItems(percent, copy), { minCharacters: 320 });
  const duration = tapeDuration(tape, { secondsPerCharacter: 0.16, minimum: 24 });
  const flashClass = flash ? `flash-${flash}` : "";
  const status =
    mode === "live"
      ? `${copy.statusLive} ${timeOnly(asAt)} UTC`
      : mode === "snapshot"
        ? `${copy.statusSnapshot} ${timeOnly(asAt)} UTC`
        : copy.statusExample;

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
                    <span className={`kjc-tape-value ${flashClass}`}>{item.value}</span>
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
          <p className={`kjc-hero tone-${dir} ${flashClass}`}>
            <span aria-hidden className="kjc-hero-arrow">{ARROW[dir]}</span>
            {signedPercent(percent)}
          </p>
        </div>
      </div>
    </section>
  );
}
