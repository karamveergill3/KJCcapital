import { Cormorant_Garamond, Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "@/app/styles/globals.css";
import { SITE_URL, SITE_HOST } from "@/lib/site";
import en from "@/lib/i18n/dictionaries/en.json" with { type: "json" };

// The Google faces are fetched once, at build time, and served from
// /_next/static/media with the rest of the site, so no page waits on a
// third-party stylesheet. Each sets a CSS variable that the font tokens in
// globals.css put at the head of their stacks. Every character in the copy
// sits in the latin subset, so only latin is preloaded; the other subsets are
// still declared by unicode-range and download only if a page uses a glyph
// from one of them.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-cormorant-garamond"
});

// Variable weight, because next/font only takes the opsz axis on the
// variable font; the browser sets optical size from the font size.
const serif = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-source-serif-4"
});

// The italic is only ever set at 400, but next/font/google would ship it with
// the whole 200 to 900 weight axis to keep opsz, at 130 KB. This is the latin
// file Google served the site before: opsz 8 to 60, weight 400, 50 KB.
const serifItalic = localFont({
  src: "./fonts/source-serif-4-italic-latin.woff2",
  weight: "400",
  style: "italic",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  variable: "--font-source-serif-4-italic"
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter"
});

// Not preloaded: on a phone the header clock is hidden and most pages set no
// mono text, so the face downloads only where something uses it. The mono
// token names the family rather than this variable; see globals.css.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono"
});

// On <html>, not <body>: the tokens are declared on :root and resolve there.
const FONT_VARIABLES = [display, serif, serifItalic, sans, mono].map((font) => font.variable).join(" ");

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KJC Capital",
    template: "%s — KJC Capital"
  },
  // The tagline is read from the dictionary so the fallback description, the
  // share cards and the structured data cannot drift from the page copy.
  description: en.meta.tagline,
  applicationName: "KJC Capital",
  // No canonical, share URL or robots here. Every page sets its own canonical
  // and URL, and root ones were inherited by every 404, pointing it at the home
  // page. Robots default to index and follow, and an explicit pair here was
  // printed beside the noindex Next adds to a 404.
  openGraph: {
    type: "website",
    siteName: "KJC Capital",
    title: "KJC Capital",
    description: en.meta.tagline,
    locale: "en_GB"
  },
  twitter: {
    card: "summary",
    title: "KJC Capital",
    description: en.meta.tagline
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel to the token Search
  // Console gives you; the meta tag only renders once it is present.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {})
};

const ORGANISATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "KJC Capital",
  url: SITE_URL,
  slogan: en.meta.tagline,
  email: `director@${SITE_HOST.replace(/^www\./, "")}`,
  areaServed: "Global"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={FONT_VARIABLES}>
      <head>
        {/* Reveal blocks start hidden and only the client script uncovers
            them, so without JavaScript they would stay invisible. */}
        <noscript>
          <style>{".fade-up{opacity:1 !important;transform:none !important}"}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANISATION_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
