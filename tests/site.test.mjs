import test from "node:test";
import assert from "node:assert/strict";
import { SITE_URL, SITE_HOST, PUBLIC_PATHS, absolute } from "../src/lib/site.js";
import { locales } from "../src/lib/i18n/config.js";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const appDir = resolve(root, "src", "app", "[lang]");

test("site origin is absolute, https, and carries no trailing slash", () => {
  assert.match(SITE_URL, /^https:\/\//);
  assert.doesNotMatch(SITE_URL, /\/$/);
  assert.equal(new URL(SITE_URL).pathname, "/");
  assert.ok(SITE_HOST.length > 0);
});

test("absolute() joins exactly one slash", () => {
  assert.equal(absolute("/en"), `${SITE_URL}/en`);
  assert.equal(absolute("en"), `${SITE_URL}/en`);
  assert.doesNotMatch(absolute("/en"), /(?<!:)\/\//);
});

test("every advertised path has a page on disk", async () => {
  const missing = [];
  for (const path of PUBLIC_PATHS) {
    const segments = path.split("/").filter(Boolean);
    const dir = segments.length ? resolve(appDir, ...segments) : appDir;
    try {
      const entries = await readdir(dir);
      if (!entries.some((e) => e.startsWith("page."))) missing.push(path || "/");
    } catch {
      missing.push(path || "/");
    }
  }
  assert.deepEqual(missing, [], `advertised in sitemap but no page: ${missing.join(", ")}`);
});

test("sitemap covers every locale and every advertised path, on the site origin", async () => {
  const { default: sitemap } = await import("../src/app/sitemap.js");
  const entries = sitemap();
  assert.equal(entries.length, locales.length * PUBLIC_PATHS.length);
  for (const entry of entries) {
    assert.ok(entry.url.startsWith(`${SITE_URL}/`), `${entry.url} is not on ${SITE_URL}`);
  }
  for (const lang of locales) {
    assert.ok(entries.some((e) => e.url === `${SITE_URL}/${lang}`));
  }
});

// kjccapital.co.uk is the only domain the firm holds. kjccapital.com belongs to
// someone else, and it has already been committed here once by mistake, which
// put a canonical tag, a sitemap and a published contact address on a domain a
// stranger controls. That is the failure these two tests exist to catch.
const CANONICAL_DOMAIN = "kjccapital.co.uk";

test("the site declares the canonical domain, apex or www", () => {
  assert.ok(
    SITE_HOST === CANONICAL_DOMAIN || SITE_HOST === `www.${CANONICAL_DOMAIN}`,
    `site origin is ${SITE_HOST}, expected ${CANONICAL_DOMAIN} or www.${CANONICAL_DOMAIN}`
  );
});

test("no published address sits on a domain the firm does not hold", async () => {
  const files = [
    "README.md",
    ".env.local.example",
    "src/lib/site.js",
    "src/lib/i18n/dictionaries/en.json",
    "src/app/[lang]/legal/privacy/page.jsx"
  ];
  const offenders = [];
  for (const file of files) {
    const body = await readFile(resolve(root, file), "utf8");
    if (/kjccapital\.com(?![a-z])/i.test(body)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `domain the firm does not hold, published in: ${offenders.join(", ")}`);
});

test("robots points at the sitemap on the same origin and keeps the portal out", async () => {
  const { default: robots } = await import("../src/app/robots.js");
  const result = robots();
  assert.equal(result.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.equal(result.host, SITE_URL);
  assert.doesNotMatch(result.host, /\/$/);
  const disallow = result.rules.flatMap((r) => r.disallow ?? []);
  assert.ok(disallow.some((d) => d.includes("portal")));
});
