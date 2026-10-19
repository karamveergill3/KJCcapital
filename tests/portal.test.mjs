import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ILLUSTRATIVE, account, activity, deskNote, exampleAccount, registers } from "../src/lib/portalExample.js";
import { kjcQuote } from "../src/lib/kjc.js";
import { snapshotAccount } from "../src/lib/keystone.js";

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
});

// The owner asked for the percentage gain and nothing besides. The board, the
// polling route and the data the page hands the browser carry no money.
test("no money figure reaches the board, the route or the page props", async () => {
  const board = await read("src", "components", "portal", "KjcBoard.jsx");
  const route = await read("src", "app", "api", "kjc", "route.js");
  const page = await read("src", "app", "[lang]", "portal", "page.jsx");
  for (const [name, src] of [["KjcBoard", board], ["api/kjc", route]]) {
    assert.doesNotMatch(src, /\bmoney\(|balance|equity|deposit|floating|closed/i, `${name} handles a money figure`);
  }
  const boardProps = page.slice(page.indexOf("<KjcBoard"), page.indexOf("/>", page.indexOf("<KjcBoard")));
  assert.match(boardProps, /initial=\{\{ percent: data\.percent, asAt: data\.asAt \}\}/);
  const snapshot = JSON.parse(await read("src", "lib", "keystoneSnapshot.json"));
  assert.deepEqual(Object.keys(snapshot).sort(), ["as_at", "daily", "kjc"]);
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

test("the example is marked as the example, as a percentage and its history", () => {
  const data = exampleAccount();
  assert.equal(data.mode, "example");
  assert.equal(data.percent, 5);
  assert.equal(data.history.length, account.snapshots.length);
  assert.equal(data.history.at(-1).kjc, 5);
});

// The snapshot is the real 500k account read from Keystone, and the board must
// call it a snapshot with its time, never live.
test("the committed snapshot is the real account, flagged as a snapshot", () => {
  const snap = snapshotAccount();
  assert.equal(snap.mode, "snapshot");
  assert.match(snap.asAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(Number.isFinite(snap.percent) && snap.percent > 0, "expected the 500k account's gain");
  assert.equal(snap.history.at(-1).kjc, snap.percent);
});
