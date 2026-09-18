import { buildTape, tapeDuration } from "@/lib/ticker";

export default function Ticker({ rows, extra, label }) {
  const tape = buildTape(rows, extra);
  if (tape.length === 0) return null;

  return (
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
  );
}

// The track carries the tape twice and travels exactly half its width, so the
// second run is already in place when the first leaves. The clone is decorative
// and hidden from the accessibility tree.
function TapeRun({ tape, ...rest }) {
  return (
    <ul className="ticker-run" {...rest}>
      {tape.map((item) => (
        <li key={item.term} className="ticker-item">
          <span className="ticker-term">{item.term}</span>
          <span className="ticker-value">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
