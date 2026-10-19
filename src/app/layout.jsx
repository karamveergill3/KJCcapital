import { Cormorant_Garamond, Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "@/app/styles/globals.css";
import { SITE_URL, SITE_HOST, absolute } from "@/lib/site";

// The faces are fetched from Google once, at build time, and served from
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
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-source-serif-4"
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains-mono"
});

// On <html>, not <body>: the tokens are declared on :root and resolve there.
const FONT_VARIABLES = [display, serif, sans, mono].map((font) => font.variable).join(" ");

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KJC Capital",
    template: "%s — KJC Capital"
  },
  description: "Gold-led capital, managed with discipline.",
  applicationName: "KJC Capital",
  alternates: {
    canonical: "/en"
  },
  openGraph: {
    type: "website",
    siteName: "KJC Capital",
    url: absolute("/en"),
    title: "KJC Capital",
    description: "Gold-led capital, managed with discipline.",
    locale: "en_GB"
  },
  twitter: {
    card: "summary",
    title: "KJC Capital",
    description: "Gold-led capital, managed with discipline."
  },
  robots: {
    index: true,
    follow: true
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
  slogan: "Gold-led capital, managed with discipline.",
  email: `director@${SITE_HOST.replace(/^www\./, "")}`,
  areaServed: "Global"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={FONT_VARIABLES}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANISATION_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
