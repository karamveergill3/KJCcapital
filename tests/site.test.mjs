import test from "node:test";
import assert from "node:assert/strict";
import { SITE_URL, SITE_HOST, PUBLIC_PATHS, NAV_ITEMS, absolute } from "../src/lib/site.js";
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

// The header and the mobile menu both offered an Investor Portal link, and both
// 404d: nothing tied a link to the existence of the page behind it. Now they
// read one list, and this checks every entry on it resolves.
test("every link in the site navigation has a page and a label", async () => {
  const dict = JSON.parse(
    await readFile(resolve(root, "src", "lib", "i18n", "dictionaries", "en.json"), "utf8")
  );
  const missingPage = [];
  const missingLabel = [];
  for (const item of NAV_ITEMS) {
    const dir = resolve(appDir, ...item.path.split("/").filter(Boolean));
    try {
      const entries = await readdir(dir);
      if (!entries.some((e) => e.startsWith("page."))) missingPage.push(item.path);
    } catch {
      missingPage.push(item.path);
    }
    if (!dict.nav[item.key]) missingLabel.push(item.key);
  }
  assert.deepEqual(missingPage, [], `offered in the nav but 404s: ${missingPage.join(", ")}`);
  assert.deepEqual(missingLabel, [], `offered in the nav but unlabelled: ${missingLabel.join(", ")}`);
});

// The portal is client-only, so it must stay out of the sitemap as well as out
// of robots.txt. Advertising it would undo the disallow.
test("the portal is reachable from the nav but never advertised", () => {
  assert.ok(NAV_ITEMS.some((i) => i.path === "/portal"));
  assert.ok(!PUBLIC_PATHS.includes("/portal"));
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

// The site says what the firm does, never who it is or where it is from: no
// location, jurisdiction, address, founding date or history. Those sat in the
// header clocks, the footer, the structured data and three legal pages, so this
// reads every source file that can put text on a page, not just the dictionary.
const IDENTITY = [
  /british virgin/i,
  /\bBVI\b/,
  /tortola/i,
  /road town/i,
  /craigmuir/i,
  /\bVG\d{4}\b/i,
  /\blondon\b/i,
  /z[uü]rich/i,
  /PostalAddress|addressCountry|foundingDate|foundingLocation/,
  /registered office/i,
  /incorporated in/i,
  /\bKJC Capital (Ltd|Limited)\b/,
  /\bsince (19|20)\d\d\b/i,
  /\b(founded|established|formalised) in (19|20)\d\d\b/i,
  /\binception\b/i,
  /\bprincipals?\b/i,
  /\bsmall (manager|firm)\b|\bsmall on purpose\b|\bat this size\b/i,
  /\bdomicile\b/i,
  /\bMMXX/
];

test("the site does not say who the firm is or where it is from", async () => {
  const src = resolve(root, "src");
  const entries = await readdir(src, { recursive: true });
  const files = entries
    .filter((e) => /\.(jsx?|json)$/.test(e))
    .map((e) => resolve(src, e));
  const offenders = [];
  for (const file of files) {
    const body = await readFile(file, "utf8");
    for (const pattern of IDENTITY) {
      const match = body.match(pattern);
      if (match) offenders.push(`${file.split("/src/")[1]}: ${match[0]}`);
    }
  }
  assert.deepEqual(offenders, [], `identifying detail on the site:\n${offenders.join("\n")}`);
});

test("the retired Firm page is gone from the nav and the sitemap", () => {
  assert.ok(!NAV_ITEMS.some((item) => item.path === "/firm"));
  assert.ok(!PUBLIC_PATHS.includes("/firm"));
});
