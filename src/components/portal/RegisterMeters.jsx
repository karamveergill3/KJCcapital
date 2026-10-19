// One meter per register: the fill is the current weight, the track is a
// lighter step of the same gold, and a hairline marks the mandate's limit. The
// numbers are written out beside each bar, so the bar is never the only way to
// read them.
export default function RegisterMeters({ registers, copy }) {
  return (
    <ul className="list-none pl-0 space-y-6">
      {registers.map((r) => {
        const bound = r.limit.max ?? r.limit.min;
        const limitText = r.limit.max != null ? `${copy.cap} ${r.limit.max}%` : `${copy.floor} ${r.limit.min}%`;
        return (
          <li key={r.name}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-[var(--color-ink)]">
                {r.name}
                <span className="smallcaps ml-3">{r.note}</span>
              </span>
              <span className="font-sans text-sm text-[var(--color-ink-soft)] whitespace-nowrap">
                <span className="font-semibold text-[var(--color-ink)]">{r.weight}%</span>
                <span className="text-[var(--color-ink-mute)]"> · {limitText}</span>
              </span>
            </div>
            <div aria-hidden className="relative mt-2 h-2 bg-[var(--color-gold-wash)]">
              <div className="absolute inset-y-0 left-0 bg-[var(--color-gold-deep)]" style={{ width: `${r.weight}%` }} />
              <div
                className="absolute -inset-y-1 w-px bg-[var(--color-ink)]"
                style={{ left: `${bound}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
