import LegalPage from "@/components/LegalPage";
import { pageMeta } from "@/lib/pageMeta";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return pageMeta({
    lang,
    path: "/legal/cookies",
    title: "Cookies",
    description: "The KJC Capital website sets no cookies."
  });
}

export default function CookiesPage() {
  return (
    <LegalPage label="Legal" title="Cookies" updated="19 October 2026">
      <p>
        The KJC Capital website does not currently set cookies. It carries no analytics
        cookies and no third-party advertising cookies, and it does not share visitor
        information with third parties for marketing purposes.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">What is set</h2>
      <p>
        Nothing. No page on the site sets a cookie, the investor portal included: it has no
        sign-in, so there is no session to keep, and the risk warning is printed on every page
        rather than accepted once and remembered. If that changes, this page will be updated
        before any cookie is set.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">How to remove them</h2>
      <p>
        A visitor may clear cookies at any time through the browser's settings. Doing so has
        no effect on this site.
      </p>
    </LegalPage>
  );
}
