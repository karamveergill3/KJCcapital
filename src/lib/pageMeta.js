import { defaultLocale } from "@/lib/i18n/config";

export const SITE_NAME = "KJC Capital";

const OPEN_GRAPH_LOCALES = { en: "en_GB" };

// Next.js does not merge a page's openGraph or twitter block into the root
// layout's; it replaces it. A page that set only its own title and URL there
// shed the site name, type and locale, and every share card fell back to the
// root's generic title. Every page under [lang] builds its metadata here, so
// each one carries the full set.
export function pageMeta({ lang, path = "", title, description }) {
  const url = `/${lang}${path}`;
  // An absolute title opts out of the root template; a share card has no
  // template to opt out of, so it takes the text as it stands.
  const shareTitle = typeof title === "string" ? title : title.absolute;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OPEN_GRAPH_LOCALES[lang] ?? OPEN_GRAPH_LOCALES[defaultLocale],
      title: shareTitle,
      description,
      url
    },
    twitter: {
      card: "summary",
      title: shareTitle,
      description
    }
  };
}
