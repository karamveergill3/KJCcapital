import "@/app/styles/globals.css";
import { SITE_URL, SITE_HOST, absolute } from "@/lib/site";

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
  "@type": "FinancialService",
  name: "KJC Capital",
  url: SITE_URL,
  slogan: "Gold-led capital, managed with discipline.",
  email: `director@${SITE_HOST.replace(/^www\./, "")}`,
  areaServed: "Global",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Craigmuir Chambers",
    addressLocality: "Road Town",
    addressRegion: "Tortola",
    postalCode: "VG1110",
    addressCountry: "VG"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* no-page-custom-font is a Pages Router rule about pages/_document.
            This is the App Router root layout, so the stylesheet is loaded once
            for every route, which is what the rule asks for. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANISATION_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
