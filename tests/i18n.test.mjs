import test from "node:test";
import assert from "node:assert/strict";
import { locales, defaultLocale, isLocale } from "../src/lib/i18n/config.js";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

test("locales contains the default", () => {
  assert.ok(locales.includes(defaultLocale));
});

test("isLocale accepts known values and rejects unknown", () => {
  assert.equal(isLocale(defaultLocale), true);
  assert.equal(isLocale("xx"), false);
  assert.equal(isLocale(""), false);
  assert.equal(isLocale(undefined), false);
});

test("English dictionary is well-formed", async () => {
  const path = resolve(here, "..", "src", "lib", "i18n", "dictionaries", "en.json");
  const raw = await readFile(path, "utf8");
  const dict = JSON.parse(raw);

  const requiredTop = ["meta", "nav", "home", "programme", "governance", "contact", "footer", "risk"];
  for (const key of requiredTop) {
    assert.ok(key in dict, `dictionary missing key "${key}"`);
  }

  assert.equal(dict.meta.firmName, "KJC Capital");
  assert.equal(typeof dict.meta.tagline, "string");
  assert.equal(typeof dict.risk.banner, "string");
  assert.ok(dict.home.principles.length >= 3, "home.principles should list at least three items");
  assert.ok(dict.home.ledger.length >= 5, "home.ledger should list at least five rows");
});

// Visible copy lives in the dictionary and, on the legal pages, the layouts and
// a few components, inline in JSX. Every one of those files is read line by
// line. Comments are not copy, and a title may use the dash as a separator
// ("Page — KJC Capital"), so a line that sets a title is let through.
test("no em-dash in visible copy (except structural title separators)", async () => {
  const src = resolve(here, "..", "src");
  const entries = await readdir(src, { recursive: true });
  const files = entries.filter(
    (e) =>
      e === join("lib", "i18n", "dictionaries", "en.json") ||
      (e.startsWith(`app${sep}`) && e.endsWith(".jsx")) ||
      (e.startsWith(`components${sep}`) && e.endsWith(".jsx"))
  );
  assert.ok(files.some((f) => f.endsWith(join("legal", "terms", "page.jsx"))), "legal pages are not being scanned");
  assert.ok(files.some((f) => f.endsWith(join("[lang]", "layout.jsx"))), "the locale layout is not being scanned");

  const offenders = [];
  for (const file of files) {
    let body = await readFile(resolve(src, file), "utf8");
    if (file.endsWith(".jsx")) {
      // Blank out comments but keep their newlines, so line numbers hold. A
      // // after a colon or quote is a URL, not a comment.
      body = body
        .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
        .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    }
    body.split("\n").forEach((line, i) => {
      if (!line.includes("—")) return;
      if (/\b(title|absolute|template)\s*:/.test(line)) return;
      offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], `em-dash in visible copy:\n${offenders.join("\n")}`);
});

// The firm has clients, not investors: it manages each client's own account and
// pools nothing. "Investor" survives only in the portal's name. This scans every
// page as well as the dictionary, because fund-era wording outlived two rewrites
// inside the legal pages, where nobody was looking.
test("visible copy says client, not investor", async () => {
  const appDir = resolve(here, "..", "src", "app");
  const entries = await readdir(appDir, { recursive: true });
  const files = [
    resolve(here, "..", "src", "lib", "i18n", "dictionaries", "en.json"),
    ...entries.filter((e) => e.endsWith("page.jsx")).map((e) => resolve(appDir, e))
  ];

  const offenders = [];
  for (const file of files) {
    const body = await readFile(file, "utf8");
    for (const match of body.matchAll(/investors?\b/gi)) {
      const tail = body.slice(match.index, match.index + 32).replace(/\s+/g, " ");
      if (!/^investor portal/i.test(tail)) {
        offenders.push(`${file.split("/src/")[1]}: ${tail}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `say client, not investor:\n${offenders.join("\n")}`);
});

// Clients are accepted from any country. The US-persons exclusion used to sit
// on six surfaces at once; if it ever comes back, it has to come back on all of
// them, so a stray copy in one place fails here rather than contradicting the
// rest of the site.
test("no surface excludes clients by nationality or residence", async () => {
  const appDir = resolve(here, "..", "src", "app");
  const entries = await readdir(appDir, { recursive: true });
  const files = [
    resolve(here, "..", "src", "lib", "i18n", "dictionaries", "en.json"),
    resolve(here, "..", "src", "lib", "pdfStyle.js"),
    ...entries.filter((e) => e.endsWith("page.jsx")).map((e) => resolve(appDir, e))
  ];
  const offenders = [];
  for (const file of files) {
    const body = await readFile(file, "utf8");
    const match = body.match(/united states persons?|\bu\.?s\.? persons?\b|regulation s\b/i);
    if (match) offenders.push(`${file.split("/src/")[1]}: ${match[0]}`);
  }
  assert.deepEqual(offenders, [], `client exclusion still published:\n${offenders.join("\n")}`);
});
