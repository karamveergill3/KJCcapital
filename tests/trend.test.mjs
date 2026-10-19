import test from "node:test";
import assert from "node:assert/strict";
import {
  RANGE_KEYS,
  appendPoint,
  appendToRanges,
  areaPath,
  buildRanges,
  defaultRange,
  nearestIndex,
  pointLabel,
  rangeStart,
  thinSeries,
  timeOf,
  trendPath,
  trendScale,
  trendSeries
} from "../src/lib/trend.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const at = (h, m = 0) => new Date(Date.UTC(2026, 9, 19, h, m)).toISOString();
const DAY_OF = [
  { at: at(14, 13), kjc: 16.5087 },
  { at: at(15, 1), kjc: 16.718 },
  { at: at(16, 5), kjc: 16.1955 },
  { at: at(17, 41), kjc: 16.5713 },
  { at: at(19, 19), kjc: 16.6309 }
];

/** Readings every stepMs from one time to another, wandering up and down. */
function readings(from, to, stepMs) {
  const out = [];
  for (let t = from, i = 0; t <= to; t += stepMs, i += 1) {
    out.push({ at: new Date(t).toISOString(), kjc: Number((Math.sin(i / 7) * 3 + i * 0.001).toFixed(4)) });
  }
  return out;
}

// The real account's life so far: 28 June to 19 October 2026, every hour.
const LIFE = readings(Date.UTC(2026, 5, 28, 9), Date.UTC(2026, 9, 19, 19), HOUR);
const LAST = timeOf(LIFE.at(-1).at);

const range = (ranges, key) => ranges.find((r) => r.key === key);

test("the series keeps valid readings only, oldest first, one per instant", () => {
  const series = trendSeries([
    DAY_OF[2],
    { at: "nonsense", kjc: 1 },
    DAY_OF[0],
    { at: at(15, 1), kjc: 99 },
    { at: at(15, 1), kjc: 16.7 },
    { at: at(18), kjc: null },
    { at: at(18), kjc: "" },
    { at: at(18), kjc: "x" }
  ]);
  assert.deepEqual(series.map((p) => p.kjc), [16.5087, 16.7, 16.1955]);
  assert.deepEqual(trendSeries(null), []);
});

// The owner asked for a staggered trend: every move between two readings is
// its own straight step, never smoothed into a curve.
test("the line is straight segments from reading to reading, never a curve", () => {
  for (const series of [trendSeries(DAY_OF), range(buildRanges(LIFE), "All").points]) {
    const scale = trendScale(series);
    const d = trendPath(series, scale, 1000, 100);
    assert.match(d, /^M/);
    assert.doesNotMatch(d, /[CQSTAHV]/i, "the path has a curve or shortcut in it");
    assert.equal((d.match(/L/g) || []).length, series.length - 1);
    assert.match(areaPath(series, scale, 1000, 100), /Z$/);
  }
});

test("the plot runs edge to edge in time, with the high above the low", () => {
  const series = trendSeries(DAY_OF);
  const scale = trendScale(series);
  assert.equal(scale.x(series[0].at), 0);
  assert.equal(scale.x(series.at(-1).at), 100);
  const high = scale.y(16.718);
  const low = scale.y(16.1955);
  assert.ok(high < low, "a higher reading should sit higher on the plot");
  assert.ok(high > 0 && low < 100, "the extremes should have room above and below");
  for (const v of scale.yTicks) assert.ok(v >= scale.lo && v <= scale.hi, `tick ${v} is off the plot`);
  assert.ok(scale.yTicks.length >= 4 && scale.yTicks.length <= 7);
});

test("a flat stretch stays flat instead of being stretched to fill the plot", () => {
  const flat = trendSeries([{ at: at(14), kjc: 5 }, { at: at(15), kjc: 5.001 }]);
  const scale = trendScale(flat);
  assert.ok(Math.abs(scale.y(5) - scale.y(5.001)) < 5);
});

// A price chart has about five gridlines at round steps. Rounding a fifth of
// the height up to the next step left two or three, or a single label once
// the latest figure's pill had hidden one.
test("the y axis has four to seven gridlines at round steps, labelled to the step", () => {
  const between = (low, high) => trendScale(trendSeries([{ at: at(14), kjc: low }, { at: at(15), kjc: high }]));
  const grid = (low, high) => {
    const { yTicks, yDigits } = between(low, high);
    return [yTicks, yDigits];
  };
  // From 1, 2 or 5 times a power of ten only, these got three or two.
  assert.deepEqual(grid(-3, 3), [[-3, -2, -1, 0, 1, 2, 3], 0]);
  assert.deepEqual(grid(10, 10.08), [[10, 10.02, 10.04, 10.06, 10.08], 2]);
  // A step of 2.5 shows one decimal, and 0.25 two.
  assert.deepEqual(grid(0, 10), [[0, 2.5, 5, 7.5, 10], 1]);
  assert.deepEqual(grid(0, 1), [[0, 0.25, 0.5, 0.75, 1], 2]);
  assert.deepEqual(grid(0, 100), [[0, 25, 50, 75, 100], 0]);
  // Where 0.025 would do as well, 0.02 keeps the labels to the headline's two decimals.
  assert.deepEqual(grid(0, 0.1), [[0, 0.02, 0.04, 0.06, 0.08, 0.1], 2]);

  for (const base of [-7.3, 0, 0.37, 16.2]) {
    for (let width = 0.0001; width < 300; width *= 1.07) {
      const scale = between(base, base + width);
      const ticks = scale.yTicks;
      assert.ok(ticks.length >= 4 && ticks.length <= 7, `${ticks.length} gridlines for ${base} to ${base + width}`);
      const step = ticks[1] - ticks[0];
      for (const [i, v] of ticks.entries()) {
        assert.ok(v >= scale.lo && v <= scale.hi, `tick ${v} is off the plot`);
        assert.ok(Math.abs(v - ticks[0] - i * step) < 1e-9, `tick ${v} is out of step`);
        assert.equal(Number(v.toFixed(scale.yDigits)), v, `tick ${v} needs more than ${scale.yDigits} decimals`);
      }
    }
  }
});

test("the ranges are the stock app's six, in order", () => {
  const ranges = buildRanges(LIFE);
  assert.deepEqual(ranges.map((r) => r.key), ["1D", "1W", "1M", "3M", "YTD", "All"]);
  assert.deepEqual(RANGE_KEYS, ["1D", "1W", "1M", "3M", "YTD", "All"]);
  for (const r of ranges) {
    for (const p of r.points) assert.deepEqual(Object.keys(p).sort(), ["at", "kjc"]);
    assert.equal(r.points.at(-1).at, LIFE.at(-1).at, `${r.key} should end on the latest reading`);
  }
});

test("each range starts its own span back from the latest reading", () => {
  const last = "2026-10-19T19:00:00.000Z";
  const t = Date.parse(last);
  assert.equal(rangeStart("1D", last), t - DAY);
  assert.equal(rangeStart("1W", last), t - 7 * DAY);
  assert.equal(rangeStart("1M", t), t - 30 * DAY);
  assert.equal(rangeStart("3M", t), t - 91 * DAY);
  assert.equal(rangeStart("YTD", last), Date.UTC(2026, 0, 1));
  assert.equal(rangeStart("YTD", "2027-01-01T00:30:00Z"), Date.UTC(2027, 0, 1));
  assert.equal(rangeStart("All", last), -Infinity);

  const ranges = buildRanges(LIFE);
  for (const key of ["1D", "1W", "1M", "3M"]) {
    const first = timeOf(range(ranges, key).points[0].at);
    assert.ok(first >= rangeStart(key, LAST), `${key} reaches back before its start`);
    assert.ok(first - rangeStart(key, LAST) < HOUR, `${key} leaves out readings inside its span`);
  }
  assert.equal(range(ranges, "All").points[0].at, LIFE[0].at);
});

// A range that would only repeat All is greyed out, as a stock app greys out
// 1Y for a stock younger than a year.
test("a range is enabled only when it shows something All does not", () => {
  const enabled = (series) => Object.fromEntries(buildRanges(series).map((r) => [r.key, r.enabled]));

  // Since 28 June: everything but YTD, which would start before the first reading.
  assert.deepEqual(enabled(LIFE), { "1D": true, "1W": true, "1M": true, "3M": true, YTD: false, All: true });

  // Three days old: a day is something less than All, a week is not.
  const young = readings(Date.UTC(2026, 9, 16, 19), Date.UTC(2026, 9, 19, 19), HOUR);
  assert.deepEqual(enabled(young), { "1D": true, "1W": false, "1M": false, "3M": false, YTD: false, All: true });

  // Started last year: the year to date is a range of its own.
  const older = readings(Date.UTC(2025, 10, 1), Date.UTC(2026, 9, 19), 6 * HOUR);
  assert.equal(enabled(older).YTD, true);
  assert.equal(range(buildRanges(older), "YTD").points[0].at, "2026-01-01T00:00:00.000Z");

  // One reading is no line at all.
  assert.ok(buildRanges([{ at: at(14), kjc: 1 }]).every((r) => !r.enabled));
  assert.ok(buildRanges(null).every((r) => !r.enabled && r.points.length === 0));
});

test("a long range is thinned to a bound, keeping its first and last reading", () => {
  const ranges = buildRanges(LIFE);
  for (const r of ranges) assert.ok(r.points.length <= 240, `${r.key} has ${r.points.length} readings`);
  const all = range(ranges, "All").points;
  assert.equal(all.length, 240);
  assert.equal(all[0].at, LIFE[0].at);
  assert.equal(all.at(-1).at, LIFE.at(-1).at);
  assert.equal(range(buildRanges(LIFE, { maxPoints: 50 }), "All").points.length, 50);

  // A short range is left as it is.
  assert.deepEqual(range(ranges, "1D").points, LIFE.filter((p) => timeOf(p.at) >= LAST - DAY));
});

// Thinning by time, not by count: a burst of readings in the last day must
// not take the place of the months before it.
test("thinning keeps the last reading of each equal stretch of time", () => {
  const sparse = readings(Date.UTC(2026, 6, 1), Date.UTC(2026, 9, 18), 6 * HOUR);
  const burst = readings(Date.UTC(2026, 9, 18, 0, 1), Date.UTC(2026, 9, 19), MINUTE);
  const series = trendSeries([...sparse, ...burst]);
  const kept = thinSeries(series, 100);
  assert.ok(kept.length <= 100);
  assert.equal(kept[0], series[0]);
  assert.equal(kept.at(-1), series.at(-1));

  const t0 = timeOf(series[0].at);
  const span = timeOf(series.at(-1).at) - t0;
  const bucket = (p) => Math.min(98, Math.floor(((timeOf(p.at) - t0) / span) * 99));
  const buckets = kept.slice(1).map(bucket);
  assert.equal(new Set(buckets).size, buckets.length, "two readings kept from one stretch");
  for (const p of kept.slice(1)) {
    const i = series.indexOf(p);
    assert.ok(i === series.length - 1 || bucket(series[i + 1]) !== bucket(p), "a reading kept that was not the last of its stretch");
  }
  const lastDay = kept.filter((p) => timeOf(p.at) >= Date.UTC(2026, 9, 18)).length;
  assert.ok(lastDay < 5, `the last day took ${lastDay} of the 100 readings`);
});

test("up to two days is labelled by the clock on whole hours", () => {
  const scale = trendScale(trendSeries(DAY_OF));
  assert.deepEqual(scale.xTicks.map((t) => t.label), ["15:00", "16:00", "17:00", "18:00", "19:00"]);
  for (const t of scale.xTicks) assert.ok(t.x > 0 && t.x < 100);
  assert.equal(pointLabel(at(17, 41), scale.spanMs), "17:41 UTC");

  const day = trendScale(range(buildRanges(LIFE), "1D").points);
  for (const t of day.xTicks) assert.match(t.label, /^\d{2}:\d{2}$/);
});

test("up to two months is labelled by the day, at UTC midnights", () => {
  const week = trendScale(range(buildRanges(LIFE), "1W").points);
  assert.deepEqual(week.xTicks.map((t) => t.label), ["14 Oct", "16 Oct", "18 Oct"]);
  assert.equal(pointLabel("2026-10-12T14:00:00Z", week.spanMs), "12 Oct, 14:00 UTC");

  const month = trendScale(range(buildRanges(LIFE), "1M").points);
  assert.deepEqual(month.xTicks.map((t) => t.label), ["21 Sep", "28 Sep", "5 Oct", "12 Oct", "19 Oct"]);
  for (const scale of [week, month]) {
    assert.ok(scale.xTicks.length >= 2 && scale.xTicks.length <= 6);
    for (const t of scale.xTicks) {
      assert.equal(t.t % DAY, 0, `${t.label} is not at midnight`);
      assert.ok(t.x >= 0 && t.x <= 100);
    }
  }
  // Weekly ticks fall on Mondays.
  for (const t of month.xTicks) assert.equal(new Date(t.t).getUTCDay(), 1);
});

test("longer is labelled by the month, with the year on the first and on January", () => {
  const all = trendScale(range(buildRanges(LIFE), "All").points);
  assert.deepEqual(all.xTicks.map((t) => t.label), ["Jul 2026", "Aug", "Sep", "Oct"]);
  assert.deepEqual(all.xTicks.map((t) => new Date(t.t).getUTCDate()), [1, 1, 1, 1]);
  assert.equal(all.xTicks[0].year, "2026");
  assert.equal(all.xTicks[0].name, "Jul");
  assert.equal(pointLabel("2026-09-30T10:00:00Z", all.spanMs), "30 Sep 2026");

  // Thirteen months are too many; every third is taken, the same months each year.
  const longer = trendScale(trendSeries([{ at: "2025-09-01", kjc: 0 }, { at: "2026-10-19", kjc: 5 }]));
  assert.deepEqual(longer.xTicks.map((t) => t.label), ["Oct 2025", "Jan 2026", "Apr", "Jul", "Oct"]);

  const year = trendScale(trendSeries([{ at: "2025-09-30", kjc: 0 }, { at: "2026-09-30", kjc: 5 }]));
  assert.deepEqual(year.xTicks.map((t) => t.label), ["Nov 2025", "Jan 2026", "Mar", "May", "Jul", "Sep"]);

  const years = trendScale(trendSeries([{ at: "2020-03-01", kjc: 0 }, { at: "2026-10-19", kjc: 5 }]));
  assert.ok(years.xTicks.length >= 2 && years.xTicks.length <= 6);
});

test("a live reading goes on the end, replaces its own instant, and never goes back in time", () => {
  const series = trendSeries(DAY_OF);
  const more = appendPoint(series, { at: at(19, 20), kjc: 16.64 });
  assert.equal(more.length, series.length + 1);
  assert.equal(more.at(-1).kjc, 16.64);

  const same = appendPoint(more, { at: at(19, 20), kjc: 16.65 });
  assert.equal(same.length, more.length);
  assert.equal(same.at(-1).kjc, 16.65);

  assert.equal(appendPoint(more, { at: at(12), kjc: 1 }), more);
  assert.equal(appendPoint(more, { at: at(20), kjc: null }), more);
  assert.equal(appendPoint(more, { at: "", kjc: 1 }), more);
});

test("a live reading goes on every range, and each keeps only its own window", () => {
  const ranges = buildRanges(LIFE);
  const reading = { at: new Date(LAST + 3 * HOUR).toISOString(), kjc: 7.5 };
  const next = appendToRanges(ranges, reading);
  const t = timeOf(reading.at);
  for (const r of next) {
    assert.deepEqual(r.points.at(-1), reading, `${r.key} did not take the reading`);
    if (r.key !== "All") assert.ok(timeOf(r.points[0].at) >= rangeStart(r.key, t), `${r.key} kept what fell out of its window`);
  }
  assert.equal(range(next, "All").points[0].at, LIFE[0].at, "All is never cut");
  assert.equal(range(next, "1D").points.length, range(ranges, "1D").points.length - 2, "1D should drop the three hours it has moved on and take one");

  // An older reading, or one that is not a reading, changes nothing.
  assert.equal(appendToRanges(next, { at: LIFE[5].at, kjc: 1 }), next);
  assert.equal(appendToRanges(next, { at: reading.at, kjc: null }), next);
});

test("after a gap a range keeps the two readings it needs to draw", () => {
  const ranges = buildRanges(LIFE);
  const monday = { at: new Date(LAST + 60 * HOUR).toISOString(), kjc: 8 };
  const next = appendToRanges(ranges, monday);
  assert.deepEqual(range(next, "1D").points, [LIFE.at(-1), monday]);
  assert.equal(range(next, "1D").enabled, true);

  // On New Year's Day the year to date starts again.
  const december = readings(Date.UTC(2026, 11, 30), Date.UTC(2026, 11, 31, 23), HOUR);
  const newYear = appendToRanges(buildRanges(december), { at: "2027-01-01T00:30:00.000Z", kjc: 3 });
  assert.deepEqual(range(newYear, "YTD").points.map((p) => p.at), [december.at(-1).at, "2027-01-01T00:30:00.000Z"]);
});

test("a live range is thinned again once it grows past twice its bound", () => {
  let ranges = buildRanges(readings(Date.UTC(2026, 9, 19, 0), Date.UTC(2026, 9, 19, 1), MINUTE), { maxPoints: 10 });
  for (let i = 1; i <= 40; i += 1) {
    ranges = appendToRanges(ranges, { at: new Date(Date.UTC(2026, 9, 19, 1) + i * MINUTE).toISOString(), kjc: i }, { maxPoints: 10 });
    for (const r of ranges) assert.ok(r.points.length <= 20, `${r.key} grew to ${r.points.length}`);
  }
  const all = range(ranges, "All").points;
  assert.equal(all[0].at, "2026-10-19T00:00:00.000Z");
  assert.equal(all.at(-1).kjc, 40);
});

test("a range comes on once the series is older than its window", () => {
  const young = readings(Date.UTC(2026, 9, 18, 23), Date.UTC(2026, 9, 19, 19), HOUR);
  const ranges = buildRanges(young);
  assert.equal(range(ranges, "1D").enabled, false);
  const later = appendToRanges(ranges, { at: "2026-10-20T00:00:00.000Z", kjc: 2 });
  assert.equal(range(later, "1D").enabled, true);
  assert.equal(range(later, "1W").enabled, false);
});

test("the board opens on All, or the longest range it can draw", () => {
  assert.equal(defaultRange(buildRanges(LIFE)), "All");
  const ranges = buildRanges(LIFE).map((r) => (r.key === "All" ? { ...r, enabled: false } : r));
  assert.equal(defaultRange(ranges), "3M");
  assert.equal(defaultRange(buildRanges([])), "All");
});

test("hovering finds the nearest reading", () => {
  const series = trendSeries(DAY_OF);
  const scale = trendScale(series);
  assert.equal(nearestIndex(series, scale, 0), 0);
  assert.equal(nearestIndex(series, scale, 100), series.length - 1);
  assert.equal(nearestIndex(series, scale, scale.x(DAY_OF[2].at) + 1), 2);
});
