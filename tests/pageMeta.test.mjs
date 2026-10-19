import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { pageMeta, SITE_NAME } from "../src/lib/pageMeta.js";

const here = dirname(fileURLToPath(import.meta.url));

test("pageMeta gives every share card the site name, type and locale", () => {
  const meta = pageMeta({ lang: "en", path: "/programme", title: "Programme", description: "What it is." });
  assert.equal(meta.title, "Programme");
  assert.equal(meta.description, "What it is.");
  assert.equal(meta.alternates.canonical, "/en/programme");
  assert.deepEqual(meta.openGraph, {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
    title: "Programme",
    description: "What it is.",
    url: "/en/programme"
  });
  assert.deepEqual(meta.twitter, { card: "summary", title: "Programme", description: "What it is." });
});

test("pageMeta keeps an absolute title for the page and shares its text", () => {
  const meta = pageMeta({ lang: "en", title: { absolute: "KJC Capital, home" }, description: "Home." });
  assert.deepEqual(meta.title, { absolute: "KJC Capital, home" });
  assert.equal(meta.openGraph.title, "KJC Capital, home");
  assert.equal(meta.twitter.title, "KJC Capital, home");
  assert.equal(meta.alternates.canonical, "/en");
  assert.equal(meta.openGraph.url, "/en");
});

// A page that writes its own openGraph block replaces the root layout's
// outright, which is how every page lost og:type, og:site_name and og:locale.
test("every page under [lang] builds its metadata through pageMeta", async () => {
  const appDir = resolve(here, "..", "src", "app", "[lang]");
  const entries = await readdir(appDir, { recursive: true });
  const pages = entries.filter((e) => e.endsWith("page.jsx"));
  assert.ok(pages.includes("page.jsx"));
  assert.ok(pages.includes(join("portal", "page.jsx")));
  assert.ok(pages.includes(join("legal", "cookies", "page.jsx")));
  const offenders = [];
  for (const page of pages) {
    const body = await readFile(resolve(appDir, page), "utf8");
    if (!body.includes("pageMeta(") || /\b(openGraph|twitter)\s*:/.test(body)) offenders.push(page);
  }
  assert.deepEqual(offenders, [], `metadata built by hand, not through pageMeta:\n${offenders.join("\n")}`);
});
