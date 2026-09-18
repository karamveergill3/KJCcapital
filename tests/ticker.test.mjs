import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildTape, tapeDuration } from "../src/lib/ticker.js";

const here = dirname(fileURLToPath(import.meta.url));

test("buildTape keeps ledger rows in order and appends the extras", () => {
  const tape = buildTape(
    [{ term: "Account holder", value: "You" }],
    [{ term: "Accepted", value: "By introduction" }]
  );
  assert.deepEqual(tape, [
    { term: "Account holder", value: "You" },
    { term: "Accepted", value: "By introduction" }
  ]);
});

test("buildTape trims and drops rows that are not a complete pair", () => {
  const tape = buildTape([
    { term: "  Pooled  ", value: " No " },
    { term: "Missing value" },
    { term: "", value: "orphan" },
    null
  ]);
  assert.deepEqual(tape, [{ term: "Pooled", value: "No" }]);
});

test("buildTape does not repeat a term the ledger already carries", () => {
  const tape = buildTape(
    [{ term: "Pooled with others", value: "No" }],
    [{ term: "pooled with others", value: "Never" }]
  );
  assert.equal(tape.length, 1);
  assert.equal(tape[0].value, "No");
});

test("buildTape tolerates being called with nothing", () => {
  assert.deepEqual(buildTape(), []);
});

test("tapeDuration grows with the copy and never dips below the minimum", () => {
  const short = buildTape([{ term: "A", value: "B" }]);
  const long = buildTape(
    Array.from({ length: 12 }, (_, i) => ({ term: `Term number ${i}`, value: `Value number ${i}` }))
  );
  assert.equal(tapeDuration(short), 28);
  assert.ok(tapeDuration(long) > tapeDuration(short));
});

test("the tape states nothing the firm cannot stand behind", async () => {
  const path = resolve(here, "..", "src", "lib", "i18n", "dictionaries", "en.json");
  const dict = JSON.parse(await readFile(path, "utf8"));
  const tape = buildTape(dict.home.ledger, dict.ticker.extra);

  assert.ok(tape.length >= 6, "the tape should be long enough to read as a tape");
  for (const item of tape) {
    // A figure on the tape would be a performance claim, and none is verified.
    assert.doesNotMatch(item.value, /\d/, `tape carries a figure: ${item.term} / ${item.value}`);
    assert.doesNotMatch(item.value, /\bfund\b|\bNAV\b|\bunits?\b/i, `tape uses pooled-fund language: ${item.value}`);
  }
});
