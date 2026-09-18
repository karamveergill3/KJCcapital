import { getDictionary } from "@/lib/i18n/getDictionary";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.firm.leadTitle,
    description: dict.firm.metaDescription,
    alternates: { canonical: `/${lang}/firm` },
    openGraph: {
      title: dict.firm.leadTitle,
      description: dict.firm.metaDescription,
      url: `/${lang}/firm`
    }
  };
}

export default async function FirmPage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { firm } = dict;
  return (
    <>
      <PageHead label="Overview" title={firm.leadTitle} lead={firm.leadIntro} />
      {firm.sections.map((section) => (
        <EditorialSection key={section.label} label={section.label} title="">
          <p>{section.body}</p>
        </EditorialSection>
      ))}
    </>
  );
}
