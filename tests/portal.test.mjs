import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ILLUSTRATIVE, account, activity, deskNote, exampleAccount, registers } from "../src/lib/portalExample.js";
import { kjcQuote } from "../src/lib/kjc.js";
import { feedToAccount, snapshotAccount, withHistory } from "../src/lib/keystone.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (...parts) => readFile(resolve(root, ...parts), "utf8");

// The figure on the board is live, a snapshot or the example, and the board's
// status light is the one thing on the page that says which. It must always
// say it, in every mode.
test("the board always says whether its figure is live, a snapshot or the example", async () => {
  assert.equal(ILLUSTRATIVE, true);
  const board = await read("src", "components", "portal", "KjcBoard.jsx");
  for (const label of ["copy.statusLive", "copy.statusSnapshot", "copy.statusExample"]) {
    assert.ok(board.includes(label), `the board no longer renders ${label}`);
  }
  assert.match(board, /\{status\}/, "the board no longer renders its status");
  const dict = JSON.parse(await read("src", "lib", "i18n", "dictionaries", "en.json"));
  assert.equal(dict.portal.quote.statusSnapshot, "Snapshot");
  assert.equal(dict.portal.quote.statusExample, "Example account");
  assert.equal(dict.portal.quote.rangeLabel, "Chart range");
});

// The owner asked for the percentage gain and nothing besides. The board, the
// polling route and the data the page hands the browser carry no money.
test("no money figure reaches the board, the route or the page props", async () => {
  const board = await read("src", "components", "portal", "KjcBoard.jsx");
  const trend = await read("src", "components", "portal", "KjcTrend.jsx");
  const trendLib = await read("src", "lib", "trend.js");
  const route = await read("src", "app", "api", "kjc", "route.js");
  const page = await read("src", "app", "[lang]", "portal", "page.jsx");
  for (const [name, src] of [["KjcBoard", board], ["KjcTrend", trend], ["lib/trend", trendLib], ["api/kjc", route]]) {
    assert.doesNotMatch(src, /\bmoney\(|balance|equity|deposit|floating|closed/i, `${name} handles a money figure`);
  }
  const boardProps = page.slice(page.indexOf("<KjcBoard"), page.indexOf("/>", page.indexOf("<KjcBoard")));
  const propNames = [...boardProps.matchAll(/\s([a-zA-Z]+)=\{/g)].map((m) => m[1]);
  assert.deepEqual(propNames.sort(), ["copy", "initial", "mode", "ranges"], "the board is handed something besides its figure and ranges");
  assert.match(boardProps, /initial=\{\{ percent: data\.percent, asAt: data\.asAt \}\}/);
  assert.match(boardProps, /ranges=\{ranges\}/);
  // The ranges are cut from the series and nothing else. The page is read as
  // text so this holds whatever lib/trend does inside buildRanges.
  assert.match(page, /import \{ buildRanges \} from "@\/lib\/trend";/);
  assert.match(page, /const ranges = buildRanges\(data\.series\);/, "the ranges are not built from the series alone");
  // That series is the committed history with the live feed after it, and the
  // page still falls back to the snapshot, then the example.
  assert.match(
    page,
    /const data = live \? withHistory\(live, snapshotAccount\(\)\) : snapshotAccount\(\) \?\? exampleAccount\(\);/,
    "the page no longer draws the live feed on the committed history, or lost a fallback"
  );

  // The month table is percentages too.
  const months = page.slice(page.indexOf("months.length > 1"), page.indexOf("</section>", page.indexOf("months.length > 1")));
  assert.match(months, /signedPercent\(m\.kjc\)/);
  // "To date" goes by when the data was taken, not the server's clock, so a
  // stale feed or snapshot never shows a mid-month reading as a month end.
  assert.match(
    page,
    /const months = monthEnds\(data\.series, mode === "example" \? undefined : new Date\(data\.asAt\)\);/,
    "the month table does not mark to date from the data's own time"
  );
  assert.doesNotMatch(months, /\bmoney\(|balance|equity|deposit|floating|closed/i, "the month table handles a money figure");

  const snapshot = JSON.parse(await read("src", "lib", "keystoneSnapshot.json"));
  assert.deepEqual(Object.keys(snapshot).sort(), ["as_at", "pct", "series"]);
  for (const p of snapshot.series) assert.deepEqual(Object.keys(p).sort(), ["at", "pct"]);
});

// Whichever mode the page is in, the series it builds the board's ranges and
// the month table from is times and percentages, even if a feed sent more.
test("the series is times and percentages in every mode", () => {
  const live = feedToAccount({
    as_at: "2026-10-19T19:19:53.992+00:00",
    pct: 16.6309,
    balance: 668730.2,
    series: [{ at: "2026-10-19T19:17:53.777+00:00", pct: 16.5715, equity: 583154.5, deposits: 500000 }]
  });
  assert.deepEqual(Object.keys(live).sort(), ["asAt", "mode", "percent", "series"]);
  const merged = withHistory(live, snapshotAccount());
  assert.deepEqual(Object.keys(merged).sort(), ["asAt", "mode", "percent", "series"]);
  for (const data of [live, merged, snapshotAccount(), exampleAccount()]) {
    assert.ok(data.series.length > 0, `the ${data.mode} series is empty`);
    for (const p of data.series) assert.deepEqual(Object.keys(p).sort(), ["at", "kjc"], `the ${data.mode} series carries more than at and kjc`);
  }
});

// What a client reads about their account never shows a trade: no order,
// position, entry, exit or profit taken. The desk note is about the news.
const TRADING = /\b(trades?|traded|trading|positions?|profits?|loss(es)?|bought|sold|buy|sell|long|short|entr(y|ies)|entered|exit(ed)?|stops?|took|taking|added|reduced|orders?|lots?|filled|hedged?)\b/i;

test("activity never mentions a trade", () => {
  assert.ok(activity.length > 0);
  for (const entry of activity) {
    assert.doesNotMatch(`${entry.kind} ${entry.summary}`, TRADING, `activity mentions trading: ${entry.summary}`);
  }
});

test("the desk note is about the news, not what the desk did", () => {
  assert.doesNotMatch(deskNote.body, TRADING, "the desk note talks about trading");
  assert.doesNotMatch(deskNote.body, /\b(we|our|the desk|the book|the firm)\b/i, "the desk note talks about the desk");
  assert.match(deskNote.body, /central bank|rate|inflation|jobs|earnings/i, "the desk note has no news in it");
});

test("the example account is forex at the core, with stocks alongside", () => {
  assert.deepEqual(registers.map((r) => r.name), ["Forex", "Stocks"]);
  assert.ok(registers[0].weight > registers[1].weight, "forex should carry the larger share");
  const total = registers.reduce((sum, r) => sum + r.weight, 0);
  assert.ok(total <= 100, `registers add up to ${total}%`);
  for (const r of registers) {
    if (r.limit.max != null) assert.ok(r.weight <= r.limit.max, `${r.name} is over its cap`);
    if (r.limit.min != null) assert.ok(r.weight >= r.limit.min, `${r.name} is under its floor`);
  }
});

test("the example ends on the owner's worked case: +5.00% after open drawdown", () => {
  const latest = account.snapshots.at(-1);
  const q = kjcQuote(latest);
  assert.equal(q.closed, 50000);
  assert.equal(q.floating, -25000);
  assert.equal(q.percent, 5);
});

test("snapshots run oldest first, one per month end, with equity never invented from nothing", () => {
  const days = account.snapshots.map((s) => s.at);
  assert.deepEqual([...days].sort(), days);
  for (const s of account.snapshots) {
    assert.ok(s.deposits > 0 && s.balance > 0 && s.equity > 0);
  }
});

test("the example is marked as the example, as a percentage and its series", () => {
  const data = exampleAccount();
  assert.equal(data.mode, "example");
  assert.equal(data.percent, 5);
  assert.equal(data.asAt, account.asAt);
  assert.equal(data.series.length, account.snapshots.length);
  assert.deepEqual(data.series.map((p) => p.at), account.snapshots.map((s) => s.at));
  assert.equal(data.series.at(-1).kjc, 5);
});

// The snapshot is the real 500k account read from Keystone, and the board must
// call it a snapshot with its time, never live.
test("the committed snapshot is the real account, flagged as a snapshot", () => {
  const snap = snapshotAccount();
  assert.equal(snap.mode, "snapshot");
  assert.match(snap.asAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(Number.isFinite(snap.percent) && snap.percent > 0, "expected the 500k account's gain");
  assert.equal(snap.series.at(-1).kjc, snap.percent);
});
