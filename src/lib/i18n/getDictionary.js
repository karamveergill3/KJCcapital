import { defaultLocale, isLocale } from "@/lib/i18n/config";

const loaders = {
  en: () => import("@/lib/i18n/dictionaries/en.json").then((mod) => mod.default)
};

export async function getDictionary(lang) {
  const key = isLocale(lang) ? lang : defaultLocale;
  return loaders[key]();
}
