"use client";

import { useEffect, useState } from "react";

function fmt(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(date);
}

function isMarketOpen(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/London"
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  if (weekday === "Sat") return false;
  if (weekday === "Sun") return hour >= 22;
  if (weekday === "Fri") return hour < 22;
  return true;
}

export default function LocalTime() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="smallcaps flex items-center gap-2 text-[var(--color-ink-mute)]">
        <span className="marker marker-mute" aria-hidden />
        <span>Markets · —</span>
      </div>
    );
  }

  const open = isMarketOpen(now);
  return (
    <div className="smallcaps flex items-center gap-3 text-[var(--color-ink-mute)]">
      <span
        className={`marker ${open ? "pulse-dot" : "marker-mute"}`}
        aria-hidden
      />
      <span>
        <span className="smallcaps-ink">{open ? "Markets open" : "Markets closed"}</span>
        <span aria-hidden> · </span>
        <span className="tabular text-[0.72rem]">LDN {fmt(now, "Europe/London")}</span>
        <span aria-hidden> · </span>
        <span className="tabular text-[0.72rem]">VG {fmt(now, "America/Tortola")}</span>
      </span>
    </div>
  );
}
