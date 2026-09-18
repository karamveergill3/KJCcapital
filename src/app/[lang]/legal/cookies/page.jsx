import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: "Cookies",
    description: "The cookies used by the KJC Capital website and what each one is for.",
    alternates: { canonical: `/${lang}/legal/cookies` },
    openGraph: { title: "Cookies", url: `/${lang}/legal/cookies` }
  };
}

export default function CookiesPage() {
  return (
    <LegalPage label="Legal" title="Cookies" updated="17 September 2026">
      <p>
        The KJC Capital website uses a minimal set of cookies. The site does not use analytics
        cookies that identify a visitor, does not carry third-party advertising cookies, and
        does not share visitor information with third parties for marketing purposes.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">What is set</h3>
      <p>
        A session cookie is set for a signed-in client to maintain the investor portal
        session. A preference cookie may be set to remember an accepted risk-warning notice.
        No further cookies are set on the public site.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">How to remove them</h3>
      <p>
        A visitor may clear cookies at any time through the browser's settings. Doing so will
        require a client to sign in to the portal again, but has no other effect.
      </p>
    </LegalPage>
  );
}
