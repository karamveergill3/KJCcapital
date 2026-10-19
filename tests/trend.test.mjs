import test from "node:test";
import assert from "node:assert/strict";
import snapshot from "../src/lib/keystoneSnapshot.json" with { type: "json" };
import { feedToAccount } from "../src/lib/keystone.js";
import {
  appendPoint,
  areaPath,
  nearestIndex,
  pointLabel,
  trendPath,
  trendScale,
  trendSeries,
  trendWindow
} from "../src/lib/trend.js";

const HOUR = 3_600_000;
const at = (h, m = 0) => new Date(Date.UTC(2026, 9, 19, h, m)).toISOString();
const DAY_OF = [
  { at: at(14, 13), kjc: 16.5087 },
  { at: at(15, 1), kjc: 16.718 },
  { at: at(16, 5), kjc: 16.1955 },
  { at: at(17, 41), kjc: 16.5713 },
  { at: at(19, 19), kjc: 16.6309 }
];

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
  const series = trendSeries(DAY_OF);
  const scale = trendScale(series);
  const d = trendPath(series, scale, 1000, 100);
  assert.match(d, /^M/);
  assert.doesNotMatch(d, /[CQSTAHV]/i, "the path has a curve or shortcut in it");
  assert.equal((d.match(/L/g) || []).length, series.length - 1);
  assert.match(areaPath(series, scale, 1000, 100), /Z$/);
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
  assert.ok(scale.yTicks.length >= 2 && scale.yTicks.length <= 6);
});

test("a day is labelled by the clock on whole hours, a year by month", () => {
  const scale = trendScale(trendSeries(DAY_OF));
  assert.deepEqual(scale.xTicks.map((t) => t.label), ["15:00", "16:00", "17:00", "18:00", "19:00"]);
  for (const t of scale.xTicks) assert.ok(t.x > 0 && t.x < 100);
  assert.equal(pointLabel(at(17, 41), scale.spanMs), "17:41 UTC");

  const months = trendSeries([
    { at: "2025-09-30", kjc: 0 },
    { at: "2026-01-31", kjc: 2.7 },
    { at: "2026-05-31", kjc: 6.2 },
    { at: "2026-09-30", kjc: 5 }
  ]);
  const yearScale = trendScale(months);
  assert.equal(yearScale.xTicks.length, 4);
  assert.equal(pointLabel("2026-09-30", yearScale.spanMs), "30 Sept 2026");
});

test("a flat stretch stays flat instead of being stretched to fill the plot", () => {
  const flat = trendSeries([{ at: at(14), kjc: 5 }, { at: at(15), kjc: 5.001 }]);
  const scale = trendScale(flat);
  assert.ok(Math.abs(scale.y(5) - scale.y(5.001)) < 5);
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

test("the trend keeps its window, but always two readings to draw", () => {
  const series = trendSeries(DAY_OF);
  const window = trendWindow(series);
  assert.equal(window, 24 * HOUR);
  // 17:00 the next day: everything before 17:00 today has dropped out.
  const nextDay = appendPoint(series, { at: new Date(Date.parse(at(17)) + 24 * HOUR).toISOString(), kjc: 17 }, window);
  assert.deepEqual(nextDay.map((p) => p.kjc), [16.5713, 16.6309, 17]);

  const afterWeekend = appendPoint(series, { at: new Date(Date.parse(at(19)) + 60 * HOUR).toISOString(), kjc: 17 }, window);
  assert.equal(afterWeekend.length, 2);

  const months = trendSeries([{ at: "2025-09-30", kjc: 0 }, { at: "2026-09-30", kjc: 5 }]);
  assert.ok(trendWindow(months) > 300 * 24 * HOUR, "a year of history should not be cut to a day");
});

test("hovering finds the nearest reading", () => {
  const series = trendSeries(DAY_OF);
  const scale = trendScale(series);
  assert.equal(nearestIndex(series, scale, 0), 0);
  assert.equal(nearestIndex(series, scale, 100), series.length - 1);
  assert.equal(nearestIndex(series, scale, scale.x(DAY_OF[2].at) + 1), 2);
});

test("the committed snapshot draws a day's trend that ends on the headline", () => {
  const account = feedToAccount(snapshot);
  assert.ok(account.intraday.length > 10, "the snapshot should carry the day's readings");
  assert.equal(account.intraday.at(-1).kjc, account.percent);
  assert.equal(account.intraday.at(-1).at, account.asAt);
  for (const p of account.intraday) assert.deepEqual(Object.keys(p).sort(), ["at", "kjc"]);
});
