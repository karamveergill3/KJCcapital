import test from "node:test";
import assert from "node:assert/strict";
import { boardFigures, tapeItems, sparkLines } from "../src/lib/kjcBoard.js";

const COPY = {
  symbol: "$KJC",
  net: "Net gain",
  closed: "Closed profit",
  floating: "Open positions",
  closedReturn: "Closed return",
  openDrawdown: "Open drawdown",
  equity: "Account value",
  balance: "Balance",
  capital: "Deposited"
};

// The 500k account as Keystone held it: 168,508.15 closed on 500,010.20, with
// 85,152.35 open against it.
const V100 = { deposits: 1000000, withdrawals: 499989.8, balance: 668518.35, equity: 583366 };

test("closed return and open drawdown add up to $KJC", () => {
  const f = boardFigures(V100);
  assert.equal(Number(f.percent.toFixed(2)), 16.67);
  assert.equal(Number(f.closedPercent.toFixed(2)), 33.7);
  assert.equal(Number(f.openPercent.toFixed(2)), -17.03);
  assert.ok(Math.abs(f.closedPercent + f.openPercent - f.percent) < 1e-9);
});

test("the tape leads with $KJC and gives every figure a direction", () => {
  const items = tapeItems(boardFigures(V100), "USD", COPY);
  assert.equal(items[0].term, "$KJC");
  assert.equal(items[0].value, "▲ +16.67%");
  assert.equal(items[0].tone, "up");
  const open = items.find((i) => i.key === "floating");
  assert.equal(open.tone, "down");
  assert.equal(open.value, "▼ −$85,152.35");
  assert.equal(items.find((i) => i.key === "equity").tone, "flat");
  assert.equal(new Set(items.map((i) => i.key)).size, items.length, "tape keys must be unique");
});

test("a flat account reads flat, with no arrow", () => {
  const items = tapeItems(boardFigures({ deposits: 500000, balance: 500000, equity: 500000 }), "USD", COPY);
  assert.equal(items[0].value, "0.00%");
  assert.equal(items[0].tone, "flat");
});

test("sparklines share one scale, and a lone point still gets a place", () => {
  const [closed, kjc] = sparkLines([[0, 10, 20], [null, null, 10]], { w: 100, h: 20, pad: 0 });
  assert.equal(closed.d, "M0.0 20.0 L50.0 10.0 L100.0 0.0");
  assert.equal(kjc.d, null);
  assert.deepEqual(kjc.last, { x: 100, y: 10 });
  assert.deepEqual(sparkLines([[]]), [{ d: null, last: null }]);
  assert.deepEqual(sparkLines([[5]]), [{ d: null, last: null }]);
});
