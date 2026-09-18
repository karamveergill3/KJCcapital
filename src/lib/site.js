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

export function absolute(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
