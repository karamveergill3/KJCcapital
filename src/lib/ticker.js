// The tape is built from the same ledger rows the home page prints, so the
// header strip can never advertise a term the page below it contradicts. Extra
// rows are carried separately: they belong on the tape but not in the table.

function normalise(row) {
  if (!row || typeof row.term !== "string" || typeof row.value !== "string") return null;
  const term = row.term.trim();
  const value = row.value.trim();
  if (!term || !value) return null;
  return { term, value };
}

export function buildTape(rows = [], extra = []) {
  const seen = new Set();
  const tape = [];
  for (const row of [...rows, ...extra]) {
    const item = normalise(row);
    if (!item) continue;
    const key = item.term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tape.push(item);
  }
  return tape;
}

// The track holds two identical runs and travels exactly one run's width, so a
// long tape has to take proportionally longer or it reads as a blur. Pace is
// set by character count rather than item count, which keeps the speed steady
// however the copy is edited.
export function tapeDuration(tape = [], { secondsPerCharacter = 0.22, minimum = 28 } = {}) {
  const characters = tape.reduce((total, item) => total + item.term.length + item.value.length + 3, 0);
  return Math.max(minimum, Math.round(characters * secondsPerCharacter));
}
