// The $KJC trend on the board: readings of { at, kjc }, oldest first, drawn as
// straight segments from one reading to the next, the way a price chart is,
// so every move between two readings shows as its own step up or down. The
// series is percentages and times only.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Shorter steps are tried first; the first that fits the axis is used.
const TIME_STEPS = [5, 10, 15, 30, 60, 120, 180, 240, 360, 720, 1440].map((m) => m * MINUTE);

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

/** How much history the board keeps while it runs: a day, or more if it started with more. */
export function trendWindow(series) {
  if (series.length < 2) return DAY;
  return Math.max(DAY, timeOf(series[series.length - 1].at) - timeOf(series[0].at));
}

/**
 * Adds a live reading to the end. A reading for the same instant replaces the
 * last one, an older one is ignored, and anything that has fallen out of the
 * window is dropped, though the line always keeps two readings to draw.
 */
export function appendPoint(series, point, windowMs = DAY) {
  const t = timeOf(point?.at);
  const kjc = num(point?.kjc);
  if (!Number.isFinite(t) || !Number.isFinite(kjc)) return series;
  const last = series[series.length - 1];
  const lastT = last ? timeOf(last.at) : -Infinity;
  if (t < lastT) return series;
  const reading = { at: String(point.at), kjc };
  const next = t === lastT ? [...series.slice(0, -1), reading] : [...series, reading];
  const kept = next.findIndex((p) => timeOf(p.at) >= t - windowMs);
  return next.slice(Math.max(0, Math.min(kept, next.length - 2)));
}

function niceStep(raw) {
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * power;
}

const utc = (options) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });
const CLOCK = utc({ hour: "2-digit", minute: "2-digit", hour12: false });
const DAY_MONTH = utc({ day: "numeric", month: "short" });
const MONTH_YEAR = utc({ month: "short", year: "2-digit" });
const FULL_DAY = utc({ day: "numeric", month: "short", year: "numeric" });

/** True when the series covers two days or less, so it is labelled by the clock. */
export const isIntraday = (spanMs) => spanMs <= 2 * DAY;

/** How one reading is named in the readout: its time, or its day for a longer trend. */
export function pointLabel(at, spanMs) {
  const d = new Date(timeOf(at));
  return isIntraday(spanMs) ? `${CLOCK.format(d)} UTC` : FULL_DAY.format(d);
}

function timeTicks(t0, t1, maxTicks) {
  for (const step of TIME_STEPS) {
    const first = Math.ceil(t0 / step) * step;
    const count = first > t1 ? 0 : Math.floor((t1 - first) / step) + 1;
    if (count <= maxTicks) {
      const ticks = Array.from({ length: count }, (_, i) => first + i * step);
      return ticks.length >= 2 ? ticks : [t0, t1];
    }
  }
  return [t0, t1];
}

/**
 * Everything the board needs to place the line: x and y as percentages of the
 * plot (y measured down from the top), and the ticks for both axes.
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
  const pad = (hi - lo) * PAD;
  lo -= pad;
  hi += pad;

  const step = niceStep((hi - lo) / 4);
  const yTicks = [];
  for (let k = Math.ceil(lo / step); k * step <= hi + 1e-9; k += 1) yTicks.push(Number((k * step).toFixed(10)));
  const yDigits = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;

  const x = (at) => (spanMs > 0 ? ((timeOf(at) - t0) / spanMs) * 100 : 100);
  const y = (value) => ((hi - value) / (hi - lo)) * 100;

  let xTicks;
  if (isIntraday(spanMs)) {
    xTicks = timeTicks(t0, t1, maxTimeTicks).map((t) => ({ t, label: CLOCK.format(new Date(t)) }));
  } else {
    const n = series.length;
    const k = Math.min(4, n);
    const format = spanMs <= 180 * DAY ? DAY_MONTH : MONTH_YEAR;
    xTicks = [...new Set(Array.from({ length: k }, (_, i) => Math.round((i * (n - 1)) / (k - 1))))]
      .map((i) => ({ t: ts[i], label: format.format(new Date(ts[i])) }));
  }
  xTicks = xTicks.map((tick) => ({ ...tick, x: spanMs > 0 ? ((tick.t - t0) / spanMs) * 100 : 100 }));

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
