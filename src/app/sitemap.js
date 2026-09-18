import { locales } from "@/lib/i18n/config";
import { PUBLIC_PATHS, absolute } from "@/lib/site";

export default function sitemap() {
  const entries = [];
  for (const lang of locales) {
    for (const path of PUBLIC_PATHS) {
      entries.push({
        url: absolute(`/${lang}${path}`),
        changeFrequency: path.startsWith("/legal") ? "yearly" : "monthly",
        priority: path === "" ? 1 : 0.6
      });
    }
  }
  return entries;
}
