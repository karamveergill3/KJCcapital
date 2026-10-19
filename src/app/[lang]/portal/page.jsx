import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured, portalPath } from "@/lib/portalAuth";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";
import SignInForm from "@/components/SignInForm";

// Who is signed in decides what this page does, so it is never prerendered.
export const dynamic = "force-dynamic";

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

  // A client who is already signed in goes straight to their account.
  if (isAuthConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) redirect(portalPath(lang, "/account"));
  }

  return (
    <>
      <PageHead label="Portal" title={portal.leadTitle} lead={portal.leadIntro} />
      <EditorialSection label={portal.signIn.label} title="">
        <SignInForm lang={lang} copy={portal.signIn} />
      </EditorialSection>
      {portal.sections.map((section) => (
        <EditorialSection key={section.label} label={section.label} title="">
          <p>{section.body}</p>
        </EditorialSection>
      ))}
    </>
  );
}
