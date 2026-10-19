import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { tapeItems } from "../src/lib/kjcBoard.js";

const here = dirname(fileURLToPath(import.meta.url));
const COPY = { symbol: "$KJC" };

test("the tape carries the percentage gain and nothing else", () => {
  const items = tapeItems(16.5852, COPY);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], { key: "kjc", term: "$KJC", value: "▲ +16.59%", tone: "up" });
});

test("a loss reads down with a real minus, and flat reads flat with no arrow", () => {
  assert.deepEqual(tapeItems(-4, COPY)[0], { key: "kjc", term: "$KJC", value: "▼ −4.00%", tone: "down" });
  assert.deepEqual(tapeItems(0, COPY)[0], { key: "kjc", term: "$KJC", value: "0.00%", tone: "flat" });
});

// The owner asked for the percentage gain and nothing besides. The board, the
// polling route and the data the page hands the browser must carry no money.
test("no money figure reaches the board, the route or the page props", async () => {
  const root = resolve(here, "..");
  const board = await readFile(resolve(root, "src", "components", "portal", "KjcBoard.jsx"), "utf8");
  const route = await readFile(resolve(root, "src", "app", "api", "kjc", "route.js"), "utf8");
  const page = await readFile(resolve(root, "src", "app", "[lang]", "portal", "page.jsx"), "utf8");
  for (const [name, src] of [["KjcBoard", board], ["api/kjc", route]]) {
    assert.doesNotMatch(src, /\bmoney\(|balance|equity|deposit|floating|closed/i, `${name} handles a money figure`);
  }
  const boardProps = page.slice(page.indexOf("<KjcBoard"), page.indexOf("/>", page.indexOf("<KjcBoard")));
  assert.match(boardProps, /initial=\{\{ percent: data\.percent, asAt: data\.asAt \}\}/);
  const snapshot = JSON.parse(await readFile(resolve(root, "src", "lib", "keystoneSnapshot.json"), "utf8"));
  assert.deepEqual(Object.keys(snapshot).sort(), ["as_at", "daily", "kjc"]);
});
