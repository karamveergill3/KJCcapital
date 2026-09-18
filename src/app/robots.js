import { SITE_URL, absolute } from "@/lib/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The portal is investor-only and carries nothing a crawler should index.
        disallow: ["/api/", "/*/portal"]
      }
    ],
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL
  };
}
