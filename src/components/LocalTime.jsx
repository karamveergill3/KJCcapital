"use client";

import { useEffect, useState } from "react";

const CLOCKS = [
  { label: "LDN", timeZone: "Europe/London" },
  { label: "VG", timeZone: "America/Tortola" }
];

function fmt(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(date);
}

export default function LocalTime() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    // The server has no client clock, so `now` starts null and both passes
    // render the same placeholder. Setting it here is the only way to avoid a
    // hydration mismatch, and it costs exactly one extra render on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="smallcaps flex shrink-0 items-center gap-2 sm:gap-3 text-[var(--color-ink-mute)]">
      <span className={`marker ${now ? "pulse-dot" : "marker-mute"}`} aria-hidden />
      <span className="smallcaps-ink hidden md:inline">Dealing desk</span>
      <span className="hidden sm:flex items-center gap-3">
        {CLOCKS.map((clock) => (
          <span key={clock.label} className="flex items-baseline gap-1.5">
            <span>{clock.label}</span>
            <span className="tabular text-[0.72rem] text-[var(--color-ink)]">
              {now ? fmt(now, clock.timeZone) : "··:··"}
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}
