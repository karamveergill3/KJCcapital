import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ILLUSTRATIVE, account, exampleAccount, registers } from "../src/lib/portalExample.js";
import { kjcQuote } from "../src/lib/kjc.js";
import { snapshotAccount } from "../src/lib/keystone.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// Invented figures on a public page are only honest if the page says so. While
// the portal runs on the example account, the notice has to be on it.
test("the example account is labelled as one wherever it is shown", async () => {
  assert.equal(ILLUSTRATIVE, true);
  const page = await readFile(resolve(root, "src", "app", "[lang]", "portal", "page.jsx"), "utf8");
  assert.match(page, /example:\s*portal\.example/, "portal page no longer picks the example notice for example data");
  assert.match(page, /snapshot:\s*portal\.snapshot/, "portal page no longer labels a snapshot as one");
  assert.match(page, /\{noticeBody\}/, "portal page no longer renders the notice");
  const dict = JSON.parse(await readFile(resolve(root, "src", "lib", "i18n", "dictionaries", "en.json"), "utf8"));
  assert.match(dict.portal.example.body, /illustrative/i);
  assert.match(dict.portal.example.body, /not the programme's track record/i);
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

test("register weights stay inside their example limits and within the whole account", () => {
  const total = registers.reduce((sum, r) => sum + r.weight, 0);
  assert.ok(total <= 100, `registers add up to ${total}%`);
  for (const r of registers) {
    if (r.limit.max != null) assert.ok(r.weight <= r.limit.max, `${r.name} is over its cap`);
    if (r.limit.min != null) assert.ok(r.weight >= r.limit.min, `${r.name} is under its floor`);
  }
});

test("the example is marked as not live, so the page labels it as an example", () => {
  const data = exampleAccount();
  assert.equal(data.mode, "example");
  assert.equal(data.history.length, account.snapshots.length);
  assert.equal(data.history.at(-1).kjc, 5);
  assert.equal(data.history.at(-1).closed, 10);
});

// The snapshot is the real 500k account read from Keystone, and the page must
// call it a snapshot with its time, never live.
test("the committed snapshot is the real account, flagged as a snapshot", async () => {
  const snap = snapshotAccount();
  assert.equal(snap.mode, "snapshot");
  assert.match(snap.asAt, /^\d{4}-\d{2}-\d{2}T/);
  const q = kjcQuote(snap.snapshot);
  assert.ok(q.percent > 0 && q.floating < 0, "expected closed profit with open drawdown");
  const dict = JSON.parse(await readFile(resolve(root, "src", "lib", "i18n", "dictionaries", "en.json"), "utf8"));
  assert.match(dict.portal.snapshot.body, /\{time\}/);
  assert.match(dict.portal.snapshot.body, /not live/);
});
