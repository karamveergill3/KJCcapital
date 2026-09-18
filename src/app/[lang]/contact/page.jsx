import { getDictionary } from "@/lib/i18n/getDictionary";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.contact.leadTitle,
    description: dict.contact.metaDescription,
    alternates: { canonical: `/${lang}/contact` },
    openGraph: {
      title: dict.contact.leadTitle,
      description: dict.contact.metaDescription,
      url: `/${lang}/contact`
    }
  };
}

export default async function ContactPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { contact } = dict;
  return (
    <>
      <PageHead label="Contact" title={contact.leadTitle} lead={contact.leadIntro} />
      {contact.sections.map((section) => (
        <EditorialSection key={section.label} label={section.label} title="">
          <p>{section.body}</p>
        </EditorialSection>
      ))}
    </>
  );
}
