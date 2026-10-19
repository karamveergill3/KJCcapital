// The $KJC trend on the board: readings of { at, kjc }, oldest first, drawn as
// straight segments from one reading to the next, the way a price chart is,
// so every move between two readings shows as its own step up or down. The
// series is percentages and times only.
//
// Like a stock chart it comes in ranges (a day, a week, a month, three months,
// the year to date and the whole life of the account), each cut from the same
// series and thinned to a few hundred readings so the line stays dense and
// jagged without asking the browser to draw thousands of segments.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The range tabs, shortest first, as stock apps order them. */
export const RANGE_KEYS = ["1D", "1W", "1M", "3M", "YTD", "All"];

// Fixed-length windows, measured back from the latest reading. YTD runs from
// 1 January of that reading's year and All has no start.
const RANGE_SPAN = { "1D": DAY, "1W": 7 * DAY, "1M": 30 * DAY, "3M": 91 * DAY };

const MAX_POINTS = 240;

// Shorter steps are tried first; the first that fits the axis is used.
const TIME_STEPS = [5, 10, 15, 30, 60, 120, 180, 240, 360, 720, 1440].map((m) => m * MINUTE);
const DAY_STEPS = [1, 2, 3, 7, 14];
const MONTH_STEPS = [1, 2, 3, 4, 6, 12];
const MAX_DATE_TICKS = 6;

// A flat stretch is drawn as flat, not stretched until noise fills the box.
const MIN_SPAN = 0.05;
const PAD = 0.12;

const num = (value) => (value === null || value === undefined || value === "" ? NaN : Number(value));

/** Milliseconds for an ISO time, or for an ISO day taken as midnight UTC. */
export function timeOf(at) {
  const text = String(at ?? "");
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return NaN;
  return Date.parse(/T/.test(text) ? text : `${text.slice(0, 10)}T00:00:00Z`);
}

/** Valid readings only, oldest first, one per instant (the later one wins). */
export function trendSeries(points) {
  const byTime = new Map();
  for (const p of Array.isArray(points) ? points : []) {
    const t = timeOf(p?.at);
    const kjc = num(p?.kjc);
    if (Number.isFinite(t) && Number.isFinite(kjc)) byTime.set(t, { at: String(p.at), kjc });
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p);
}

/**
 * Where a range starts, in milliseconds, for a latest reading at lastAt (an
 * ISO time or milliseconds): a fixed span back from it, 1 January 00:00 UTC
 * of its year for YTD, and no start at all for All.
 */
export function rangeStart(key, lastAt) {
  const last = typeof lastAt === "number" ? lastAt : timeOf(lastAt);
  if (key === "YTD") return Date.UTC(new Date(last).getUTCFullYear(), 0, 1);
  return key in RANGE_SPAN ? last - RANGE_SPAN[key] : -Infinity;
}

/**
 * At most maxPoints readings with the same shape as the series: the span is
 * split into equal stretches of time and the last reading of each is kept,
 * like a price chart's closing price per bar, so a burst of readings late on
 * cannot crowd out the months before it. The first reading is always kept,
 * and the last is, being the last of the final stretch.
 */
export function thinSeries(series, maxPoints = MAX_POINTS) {
  if (series.length <= maxPoints) return series;
  const buckets = Math.max(1, Math.floor(maxPoints) - 1);
  const t0 = timeOf(series[0].at);
  const span = timeOf(series[series.length - 1].at) - t0;
  const kept = [series[0]];
  for (let i = 1; i < series.length; i += 1) {
    const bucket = Math.min(buckets - 1, Math.floor(((timeOf(series[i].at) - t0) / span) * buckets));
    const next = series[i + 1];
    const nextBucket = next ? Math.min(buckets - 1, Math.floor(((timeOf(next.at) - t0) / span) * buckets)) : Infinity;
    if (nextBucket !== bucket) kept.push(series[i]);
  }
  return kept;
}

// A range is offered when it has a line to draw and shows something All does
// not: a series younger than a week has nothing for 1W but All again, so the
// tab is greyed out, the way stock apps grey out 1Y for a younger stock.
const isEnabled = (key, points, firstAt, start) => points.length >= 2 && (key === "All" || firstAt < start);

/**
 * The six ranges of a series, in tab order: [{ key, enabled, points }], each
 * the readings at or after its start, thinned to maxPoints.
 */
export function buildRanges(series, { maxPoints = MAX_POINTS } = {}) {
  const all = trendSeries(series);
  const first = all.length ? timeOf(all[0].at) : NaN;
  const last = all.length ? timeOf(all[all.length - 1].at) : NaN;
  return RANGE_KEYS.map((key) => {
    const start = rangeStart(key, last);
    const points = thinSeries(all.filter((p) => timeOf(p.at) >= start), maxPoints);
    return { key, enabled: isEnabled(key, points, first, start), points };
  });
}

/**
 * Adds a live reading to the end. A reading for the same instant replaces the
 * last one, and an older one is ignored (the series comes back unchanged).
 */
export function appendPoint(series, point) {
  const t = timeOf(point?.at);
  const kjc = num(point?.kjc);
  if (!Number.isFinite(t) || !Number.isFinite(kjc)) return series;
  const last = series[series.length - 1];
  const lastT = last ? timeOf(last.at) : -Infinity;
  if (t < lastT) return series;
  const reading = { at: String(point.at), kjc };
  return t === lastT ? [...series.slice(0, -1), reading] : [...series, reading];
}

/**
 * The ranges with a live reading added to each. Every range but All then
 * drops what has fallen out of its window, though a line always keeps two
 * readings to draw (after a weekend 1D is the last reading before it and the
 * new one). A range that has grown past twice maxPoints is thinned again, and
 * a range whose window the series has outgrown becomes enabled.
 */
export function appendToRanges(ranges, point, { maxPoints = MAX_POINTS } = {}) {
  const t = timeOf(point?.at);
  if (!Number.isFinite(t) || !Number.isFinite(num(point?.kjc))) return ranges;
  const all = ranges.find((r) => r.key === "All");
  const first = all?.points.length ? timeOf(all.points[0].at) : t;
  const next = ranges.map((range) => {
    const added = appendPoint(range.points, point);
    if (added === range.points) return range;
    const start = rangeStart(range.key, t);
    const inside = added.findIndex((p) => timeOf(p.at) >= start);
    let points = added.slice(Math.max(0, Math.min(inside, added.length - 2)));
    if (points.length > 2 * maxPoints) points = thinSeries(points, maxPoints);
    return { ...range, enabled: isEnabled(range.key, points, first, start), points };
  });
  // A reading older than every range changes nothing, so the board need not redraw.
  return next.every((range, i) => range === ranges[i]) ? ranges : next;
}

/** The range a board opens on: All, or the longest one enabled if All is not. */
export function defaultRange(ranges) {
  const enabled = ranges.filter((r) => r.enabled);
  if (enabled.some((r) => r.key === "All")) return "All";
  const span = (r) => timeOf(r.points[r.points.length - 1].at) - timeOf(r.points[0].at);
  return enabled.reduce((best, r) => (!best || span(r) > span(best) ? r : best), null)?.key ?? "All";
}

/** The multiples of step from lo up to hi. */
function gridlines(lo, hi, step) {
  const values = [];
  for (let k = Math.ceil(lo / step); k * step <= hi + 1e-9; k += 1) values.push(Number((k * step).toFixed(10)));
  return values;
}

/** The decimals a step needs to be read exactly: none for 5, one for 2.5, two for 0.25. */
function decimalsOf(step) {
  let digits = 0;
  while (digits < 6 && Math.abs(step * 10 ** digits - Math.round(step * 10 ** digits)) > 1e-6) digits += 1;
  return digits;
}

// The y gridlines go at 1, 2, 2.5 or 5 times a power of ten: four to seven
// of them, as close to five as the steps allow, as on a price chart (rounding
// a fifth of the height up to the next step could leave only two). The labels
// carry the decimals the step needs, and a step finer than the latest
// figure's two decimals is taken only when no coarser one gives four to seven.
function yGrid(lo, hi) {
  const exponent = Math.floor(Math.log10((hi - lo) / 5));
  let best = { ticks: [], digits: 0, miss: Infinity };
  for (let e = exponent - 1; e <= exponent + 1; e += 1) {
    for (const factor of [1, 2, 2.5, 5]) {
      const step = factor * 10 ** e;
      const ticks = gridlines(lo, hi, step);
      const digits = decimalsOf(step);
      const n = ticks.length;
      const miss = (n < 4 || n > 7 ? 100 : 0) + (digits > 2 ? 10 : 0) + Math.abs(n - 5);
      // On a tie the closer gridlines win, being found first.
      if (miss < best.miss) best = { ticks, digits, miss };
    }
  }
  return best;
}

// Labels are put together by hand rather than through Intl, so the server and
// the browser always agree on them ("Sep", never "Sept" from one of them).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const clock = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const dayMonth = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

/** True when the series covers two days or less, so it is labelled by the clock. */
export const isIntraday = (spanMs) => spanMs <= 2 * DAY;

/** True when the series covers two months or less, so it is labelled by the day. */
export const isDaily = (spanMs) => !isIntraday(spanMs) && spanMs <= 62 * DAY;

/** How one reading is named in the readout: its time, its day and hour, or its day. */
export function pointLabel(at, spanMs) {
  const d = new Date(timeOf(at));
  if (isIntraday(spanMs)) return `${clock(d)} UTC`;
  if (isDaily(spanMs)) return `${dayMonth(d)}, ${clock(d)} UTC`;
  return `${dayMonth(d)} ${d.getUTCFullYear()}`;
}

function timeTicks(t0, t1, maxTicks) {
  for (const step of TIME_STEPS) {
    const first = Math.ceil(t0 / step) * step;
    const count = first > t1 ? 0 : Math.floor((t1 - first) / step) + 1;
    if (count <= maxTicks) {
      const ticks = Array.from({ length: count }, (_, i) => first + i * step);
      return (ticks.length >= 2 ? ticks : [t0, t1]).map((t) => ({ t, label: clock(new Date(t)) }));
    }
  }
  return [t0, t1].map((t) => ({ t, label: clock(new Date(t)) }));
}

// UTC midnights, every one, two or three days, or every week or fortnight on
// Mondays (1 January 1970 was a Thursday, so day 4 was a Monday).
function dayTicks(t0, t1) {
  const firstDay = Math.ceil(t0 / DAY);
  const lastDay = Math.floor(t1 / DAY);
  for (const step of DAY_STEPS) {
    const offset = step >= 7 ? 4 : 0;
    const start = firstDay + ((((offset - firstDay) % step) + step) % step);
    const days = [];
    for (let d = start; d <= lastDay; d += step) days.push(d);
    if (days.length <= MAX_DATE_TICKS) return days.map((d) => ({ t: d * DAY, label: dayMonth(new Date(d * DAY)) }));
  }
  return [];
}

// The first of each month, or of every second, third... month counted from
// January, so the ticks fall on the same months every year. The year goes on
// the first tick and on each January, and is also given on its own so a
// phone can set it under the month rather than beside it.
function monthTicks(t0, t1) {
  const from = new Date(t0);
  let month = from.getUTCFullYear() * 12 + from.getUTCMonth();
  if (Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1) < t0) month += 1;
  const to = new Date(t1);
  const lastMonth = to.getUTCFullYear() * 12 + to.getUTCMonth();
  // After one a year come one every two years, every three, and so on.
  for (let i = 0; ; i += 1) {
    const step = i < MONTH_STEPS.length ? MONTH_STEPS[i] : 12 * (i - MONTH_STEPS.length + 2);
    const months = [];
    for (let m = month + ((step - (month % step)) % step); m <= lastMonth; m += step) months.push(m);
    if (months.length <= MAX_DATE_TICKS) {
      return months.map((m, n) => {
        const year = Math.floor(m / 12);
        const name = MONTHS[m % 12];
        const t = Date.UTC(year, m % 12, 1);
        return n === 0 || m % 12 === 0 ? { t, label: `${name} ${year}`, name, year: String(year) } : { t, label: name };
      });
    }
  }
}

/**
 * Everything the board needs to place the line: x and y as percentages of the
 * plot (y measured down from the top), and the ticks for both axes. The time
 * axis is clock times up to two days, days up to two months, months beyond.
 */
export function trendScale(series, { maxTimeTicks = 5 } = {}) {
  const ts = series.map((p) => timeOf(p.at));
  const values = series.map((p) => p.kjc);
  const t0 = ts[0];
  const t1 = ts[ts.length - 1];
  const spanMs = t1 - t0;

  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2;
    lo = mid - MIN_SPAN / 2;
    hi = mid + MIN_SPAN / 2;
  }
  const padding = (hi - lo) * PAD;
  lo -= padding;
  hi += padding;

  const { ticks: yTicks, digits: yDigits } = yGrid(lo, hi);

  const x = (at) => (spanMs > 0 ? ((timeOf(at) - t0) / spanMs) * 100 : 100);
  const y = (value) => ((hi - value) / (hi - lo)) * 100;

  const ticks = isIntraday(spanMs)
    ? timeTicks(t0, t1, maxTimeTicks)
    : isDaily(spanMs)
      ? dayTicks(t0, t1)
      : monthTicks(t0, t1);
  const xTicks = ticks.map((tick) => ({ ...tick, x: spanMs > 0 ? ((tick.t - t0) / spanMs) * 100 : 100 }));

  return { x, y, lo, hi, spanMs, yTicks, yDigits, xTicks };
}

/** The line as SVG path data in a width by height box: moves and straight lines only. */
export function trendPath(series, scale, width, height) {
  return series
    .map((p, i) => `${i ? "L" : "M"}${((scale.x(p.at) * width) / 100).toFixed(2)} ${((scale.y(p.kjc) * height) / 100).toFixed(2)}`)
    .join(" ");
}

/** The same line run down to the bottom of the box and back, for the wash under it. */
export function areaPath(series, scale, width, height) {
  const first = ((scale.x(series[0].at) * width) / 100).toFixed(2);
  const last = ((scale.x(series[series.length - 1].at) * width) / 100).toFixed(2);
  return `${trendPath(series, scale, width, height)} L${last} ${height} L${first} ${height} Z`;
}

/** The reading nearest a point across the plot, given as a percentage of its width. */
export function nearestIndex(series, scale, xPercent) {
  let best = 0;
  let distance = Infinity;
  series.forEach((p, i) => {
    const d = Math.abs(scale.x(p.at) - xPercent);
    if (d < distance) {
      best = i;
      distance = d;
    }
  });
  return best;
}
