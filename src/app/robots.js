import { SITE_URL, absolute } from "@/lib/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The portal is not disallowed. It keeps itself out of the index with
        // its own noindex, and a crawler only reads that if it may fetch the page.
        disallow: ["/api/"]
      }
    ],
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL
  };
}
