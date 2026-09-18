import Link from "next/link";
import { getDictionary } from "@/lib/i18n/getDictionary";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.portal.leadTitle,
    description: dict.portal.metaDescription,
    alternates: { canonical: `/${lang}/portal` },
    // robots.txt already disallows /*/portal. Saying it again in the page's own
    // head means a crawler that ignores one still sees the other.
    robots: { index: false, follow: false },
    openGraph: {
      title: dict.portal.leadTitle,
      description: dict.portal.metaDescription,
      url: `/${lang}/portal`
    }
  };
}

export default async function PortalPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { portal } = dict;
  return (
    <>
      <PageHead label="Portal" title={portal.leadTitle} lead={portal.leadIntro} />
      {portal.sections.map((section) => (
        <EditorialSection key={section.label} label={section.label} title="">
          <p>{section.body}</p>
        </EditorialSection>
      ))}
      <section className="shell py-12 md:py-16 border-t border-[var(--color-rule)]">
        <Link href={`/${lang}/contact`} className="btn btn-gold">
          <span>{portal.cta}</span>
        </Link>
      </section>
    </>
  );
}
