import test from "node:test";
import assert from "node:assert/strict";
import { kjcQuote, kjcHistory, maxDrawdown, signedPercent, money, direction } from "../src/lib/kjc.js";

// The owner's own example: 50,000 made on 500,000, with 25,000 still open in
// drawdown. The client sees the 25,000 that is not in drawdown, so +5.00%.
test("$KJC counts open drawdown against closed profit", () => {
  const q = kjcQuote({ deposits: 500000, balance: 550000, equity: 525000 });
  assert.equal(q.capital, 500000);
  assert.equal(q.closed, 50000);
  assert.equal(q.floating, -25000);
  assert.equal(q.net, 25000);
  assert.equal(q.percent, 5);
  assert.equal(signedPercent(q.percent), "+5.00%");
});

test("open profit counts too, and withdrawals reduce the capital measured against", () => {
  assert.equal(kjcQuote({ deposits: 500000, balance: 500000, equity: 510000 }).percent, 2);
  const q = kjcQuote({ deposits: 600000, withdrawals: 100000, balance: 520000, equity: 520000 });
  assert.equal(q.capital, 500000);
  assert.equal(q.percent, 4);
});

test("a loss quotes negative, with a real minus sign", () => {
  const q = kjcQuote({ deposits: 500000, balance: 495000, equity: 480000 });
  assert.equal(q.percent, -4);
  assert.equal(signedPercent(q.percent), "−4.00%");
  assert.equal(direction(q.percent), "down");
});

test("no capital means no quote, rather than a division by zero", () => {
  assert.throws(() => kjcQuote({ deposits: 0, balance: 0, equity: 0 }));
  assert.throws(() => kjcQuote({ deposits: 100, withdrawals: 100, balance: 0, equity: 0 }));
});

test("history quotes every snapshot in order", () => {
  const history = kjcHistory([
    { at: "2026-08-31", deposits: 500000, balance: 540000, equity: 548000 },
    { at: "2026-09-30", deposits: 500000, balance: 550000, equity: 525000 }
  ]);
  assert.deepEqual(history.map((h) => h.at), ["2026-08-31", "2026-09-30"]);
  assert.equal(history[0].percent, 9.6);
  assert.equal(history[1].percent, 5);
});

test("max drawdown is the worst fall in equity from a prior high", () => {
  const dd = maxDrawdown([
    { equity: 500000 },
    { equity: 550000 },
    { equity: 495000 },
    { equity: 560000 },
    { equity: 532000 }
  ]);
  assert.equal(Number(dd.toFixed(4)), -10);
  assert.equal(maxDrawdown([{ equity: 1 }, { equity: 2 }]), 0);
});

test("figures format the way they are read", () => {
  assert.equal(signedPercent(0), "0.00%");
  assert.equal(signedPercent(-0.001), "0.00%");
  assert.equal(direction(-0.001), "flat");
  assert.equal(money(525000), "$525,000.00");
  assert.equal(money(-25000, "USD", { signed: true }), "−$25,000.00");
  assert.equal(money(50000, "USD", { signed: true }), "+$50,000.00");
  assert.equal(money(0, "USD", { signed: true }), "$0.00");
});

test("dates read the same on any server", async () => {
  const { longDate, shortMonth } = await import("../src/lib/kjc.js");
  assert.equal(longDate("2026-09-30"), "30 September 2026");
  // ICU writes September as "Sep" or "Sept" depending on its version.
  assert.match(shortMonth("2026-09-30"), /^Sept? 2026$/);
  assert.equal(shortMonth("2025-10-31"), "Oct 2025");
  assert.equal(shortMonth("2026-01-01"), "Jan 2026");
});
