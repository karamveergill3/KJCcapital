// Vercel serves www as the production domain and 308-redirects the apex to it,
// so www is what the site must declare. An apex canonical would point every
// page at a URL that immediately redirects.
const FALLBACK = "https://www.kjccapital.co.uk";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK).replace(/\/+$/, "");

export const SITE_HOST = new URL(SITE_URL).host;

/** Routes that exist and should be advertised, relative to a locale root. */
export const PUBLIC_PATHS = [
  "",
  "/firm",
  "/programme",
  "/governance",
  "/contact",
  "/legal/terms",
  "/legal/privacy",
  "/legal/cookies",
  "/legal/risk",
  "/legal/disclosures"
];

/**
 * Routes reachable from the site navigation, relative to a locale root. The
 * header and the mobile menu both read this, so a link cannot be offered in one
 * and missing from the other, and tests/site.test.mjs can check that every one
 * of them actually has a page. /portal was linked from both and 404d from both.
 */
export const NAV_ITEMS = [
  { key: "firm", path: "/firm" },
  { key: "programme", path: "/programme" },
  { key: "governance", path: "/governance" },
  { key: "contact", path: "/contact" },
  { key: "portal", path: "/portal", rule: true }
];

export function absolute(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
