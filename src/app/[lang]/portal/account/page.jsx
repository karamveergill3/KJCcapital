import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured, portalPath } from "@/lib/portalAuth";
import PageHead from "@/components/PageHead";
import EditorialSection from "@/components/EditorialSection";
import { signOut } from "../actions";

// Who is signed in decides what this page does, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.portal.account.title,
    robots: { index: false, follow: false }
  };
}

export default async function AccountPage({ params }) {
  const { lang } = await params;
  if (!isAuthConfigured()) redirect(portalPath(lang));

  // getUser, not getSession: it asks Supabase to vouch for the token rather
  // than trusting whatever the cookie says.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect(portalPath(lang));

  const dict = await getDictionary(lang);
  const { account } = dict.portal;
  return (
    <>
      <PageHead
        label="Portal"
        title={account.title}
        lead={`${account.signedInAs} ${data.user.email}.`}
      />
      {account.sections.map((section) => (
        <EditorialSection key={section.label} label={section.label} title="">
          <p>{section.body}</p>
        </EditorialSection>
      ))}
      <section className="shell py-12 md:py-16 border-t border-[var(--color-rule)]">
        <form action={signOut}>
          <input type="hidden" name="lang" value={lang} />
          <button type="submit" className="btn">
            <span>{account.signOut}</span>
          </button>
        </form>
      </section>
    </>
  );
}
