"use client";

import { useState } from "react";
import { buildTape, fillTape, tapeDuration } from "@/lib/ticker";
import TapeToggle from "@/components/TapeToggle";

export default function Ticker({ rows, extra, label, pause }) {
  const [paused, setPaused] = useState(false);
  const tape = fillTape(buildTape(rows, extra));
  if (tape.length === 0) return null;

  // The button sits beside the tape, not inside it, so the edge fade never
  // dims it. Hover still pauses the tape for a pointer; the button is the
  // pause that works by keyboard and touch, and it holds until pressed again.
  return (
    <div className="ticker-wrap" data-paused={paused ? "true" : "false"}>
      <TapeToggle paused={paused} onToggle={() => setPaused((p) => !p)} label={pause} />
      <div
        className="ticker"
        style={{ "--ticker-duration": `${tapeDuration(tape)}s` }}
        role="group"
        aria-label={label}
      >
        <div className="ticker-track">
          <TapeRun tape={tape} />
          <TapeRun tape={tape} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

// The track carries the tape twice and travels exactly half its width, so the
// second run is already in place when the first leaves. The clone is decorative
// and hidden from the accessibility tree.
function TapeRun({ tape, ...rest }) {
  return (
    <ul className="ticker-run" {...rest}>
      {tape.map((item, i) => (
        <li key={`${i}-${item.term}`} className="ticker-item">
          <span className="ticker-term">{item.term}</span>
          <span className="ticker-value">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
