import test from "node:test";
import assert from "node:assert/strict";
import { PAGE, COLORS, TYPE, SIZES, DISCLOSURE_LINE } from "../src/lib/pdfStyle.js";

test("page geometry is A4 with generous margins", () => {
  assert.equal(PAGE.size, "A4");
  assert.ok(PAGE.margins.top >= 72);
  assert.ok(PAGE.margins.bottom >= 72);
});

test("brand palette exposes ink, gold, and semantic P&L colours", () => {
  assert.equal(COLORS.ink, "#131313");
  assert.equal(COLORS.gold, "#b08a3c");
  assert.equal(COLORS.gain, "#3b5b3c");
  assert.equal(COLORS.loss, "#8a3d3d");
});

test("typography defaults to serif for body and headlines", () => {
  assert.equal(TYPE.serif, "Times-Roman");
  assert.equal(TYPE.serifBold, "Times-Bold");
});

test("size scale is monotonically decreasing from title to micro", () => {
  const scale = [SIZES.title, SIZES.h2, SIZES.h3, SIZES.body, SIZES.small, SIZES.micro];
  for (let i = 1; i < scale.length; i += 1) {
    assert.ok(scale[i] < scale[i - 1], `SIZES not monotonic at index ${i}`);
  }
});

test("disclosure line names the fund, the risk of loss, and excludes US persons", () => {
  assert.match(DISCLOSURE_LINE, /KJC Growth Fund/);
  assert.doesNotMatch(DISCLOSURE_LINE, /\bFX\b|currency/i);
  assert.match(DISCLOSURE_LINE, /Capital is at risk/i);
  assert.match(DISCLOSURE_LINE, /United States persons/i);
});
