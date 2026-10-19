import { getDictionary } from "@/lib/i18n/getDictionary";
import { pageMeta } from "@/lib/pageMeta";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return pageMeta({
    lang,
    path: "/governance",
    title: dict.governance.leadTitle,
    description: dict.governance.metaDescription
  });
}

export default async function GovernancePage({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { governance } = dict;
  return (
    <>
      <PageHead label="Framework" title={governance.leadTitle} lead={governance.leadIntro} />
      {governance.sections.map((section) => (
        <EditorialSection key={section.label} label={section.label} title="">
          <p>{section.body}</p>
        </EditorialSection>
      ))}
    </>
  );
}
