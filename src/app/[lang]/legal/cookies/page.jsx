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
    <LegalPage label="Legal" title="Cookies" updated="19 October 2026">
      <p>
        The KJC Capital website uses a minimal set of cookies. The site does not use analytics
        cookies that identify a visitor, does not carry third-party advertising cookies, and
        does not share visitor information with third parties for marketing purposes.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">What is set</h2>
      <p>
        The investor portal has no sign-in at present, so no session cookie is set. A
        preference cookie may be set to remember an accepted risk-warning notice. No further
        cookies are set.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">How to remove them</h2>
      <p>
        A visitor may clear cookies at any time through the browser's settings. Doing so has
        no effect beyond showing the risk-warning notice again.
      </p>
    </LegalPage>
  );
}
