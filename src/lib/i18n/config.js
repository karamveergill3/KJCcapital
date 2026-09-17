export const locales = ["en"];
export const defaultLocale = "en";

export function isLocale(candidate) {
  return locales.includes(candidate);
}
