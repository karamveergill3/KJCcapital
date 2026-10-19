import LegalPage from "@/components/LegalPage";
import { pageMeta } from "@/lib/pageMeta";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return pageMeta({
    lang,
    path: "/legal/terms",
    title: "Terms of use",
    description: "Terms of use for the KJC Capital website. Nothing on this site is an offer to the public or the terms on which the firm manages an account."
  });
}

export default function TermsPage() {
  return (
    <LegalPage label="Legal" title="Terms of use" updated="19 October 2026">
      <p>
        These terms govern the use of the KJC Capital website by any visitor. They are not the
        terms on which the firm manages an account; those are set out in the client agreement,
        furnished to prospective clients by introduction.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Nature of this website</h2>
      <p>
        The site is informational. Nothing on it constitutes an offer to the public, an
        invitation to invest, a recommendation, or investment advice. The programme is
        available only to persons the firm has satisfied itself are eligible, and only by
        direct introduction.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Eligibility</h2>
      <p>
        The investor portal on this site shows an example account, and every figure on it is
        illustrative. A client&apos;s own figures are shown only to that client. The programme
        is available only to persons who have passed the firm&apos;s identity and
        anti-money-laundering checks.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Intellectual property</h2>
      <p>
        The content of the site, the firm name, and the mark used with it are
        the property of KJC Capital. They may be quoted for the purposes of review or reporting
        but not reproduced in full without written permission.
      </p>
      <h2 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Governing law</h2>
      <p>
        These terms are governed by the laws of the jurisdiction in which KJC Capital is
        established. Any dispute arising from a visitor's use of the site is subject to the
        exclusive jurisdiction of the courts of that jurisdiction.
      </p>
    </LegalPage>
  );
}
