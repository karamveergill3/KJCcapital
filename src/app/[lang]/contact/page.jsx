import { getDictionary } from "@/lib/i18n/getDictionary";
import { pageMeta } from "@/lib/pageMeta";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMeta({
    lang,
    path: "/contact",
    title: dict.contact.leadTitle,
    description: dict.contact.metaDescription
  });
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
