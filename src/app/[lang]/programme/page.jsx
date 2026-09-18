import { getDictionary } from "@/lib/i18n/getDictionary";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.programme.leadTitle,
    description: dict.programme.metaDescription,
    alternates: { canonical: `/${lang}/programme` },
    openGraph: {
      title: dict.programme.leadTitle,
      description: dict.programme.metaDescription,
      url: `/${lang}/programme`
    }
  };
}

export default async function ProgrammePage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { programme } = dict;
  return (
    <>
      <PageHead label="Strategy" title={programme.leadTitle} lead={programme.leadIntro} />
      {programme.sections.map((section) => (
        <EditorialSection key={section.label} label={section.label} title="">
          <p>{section.body}</p>
        </EditorialSection>
      ))}
    </>
  );
}
