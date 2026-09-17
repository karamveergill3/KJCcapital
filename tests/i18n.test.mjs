import test from "node:test";
import assert from "node:assert/strict";
import { locales, defaultLocale, isLocale } from "../src/lib/i18n/config.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

  const requiredTop = ["meta", "nav", "home", "firm", "programme", "governance", "contact", "footer", "risk"];
  for (const key of requiredTop) {
    assert.ok(key in dict, `dictionary missing key "${key}"`);
  }

  assert.equal(dict.meta.firmName, "KJC Capital");
  assert.equal(typeof dict.meta.tagline, "string");
  assert.equal(typeof dict.risk.banner, "string");
  assert.ok(dict.home.principles.length >= 3, "home.principles should list at least three items");
  assert.ok(dict.home.ledger.length >= 5, "home.ledger should list at least five rows");
});

test("no em-dash in visible copy (except structural title separators)", async () => {
  const path = resolve(here, "..", "src", "lib", "i18n", "dictionaries", "en.json");
  const dict = JSON.parse(await readFile(path, "utf8"));

  const visit = (node, path) => {
    if (typeof node === "string") {
      if (node.includes("—")) {
        throw new Error(`Em-dash found in dictionary at ${path}: ${node}`);
      }
    } else if (Array.isArray(node)) {
      node.forEach((child, i) => visit(child, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        visit(v, `${path}.${k}`);
      }
    }
  };

  visit(dict, "root");
});
