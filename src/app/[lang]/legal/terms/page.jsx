import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: "Terms of use",
    description: "Terms of use for the KJC Capital website. Nothing on this site is an offer to the public or the offering terms of the fund.",
    alternates: { canonical: `/${lang}/legal/terms` },
    openGraph: { title: "Terms of use", url: `/${lang}/legal/terms` }
  };
}

export default function TermsPage() {
  return (
    <LegalPage label="Legal" title="Terms of use" updated="17 September 2026">
      <p>
        These terms govern the use of the KJC Capital website by any visitor. They are not the
        terms on which the KJC Growth Fund is offered; the offering terms are set out in the
        subscription agreement furnished to prospective investors by introduction.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Nature of this website</h3>
      <p>
        The site is informational. Nothing on it constitutes an offer to the public, an
        invitation to subscribe, a recommendation, or investment advice. The fund is
        available only to persons the firm has satisfied itself are eligible to invest, and
        only by direct introduction.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Eligibility</h3>
      <p>
        Access to the investor portal is available only to investors admitted to the fund. The
        fund does not accept subscriptions from United States persons within the meaning of
        Regulation S, and the firm will not respond to enquiries that indicate US residence,
        US citizenship, or a US taxable presence.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Intellectual property</h3>
      <p>
        The content of the site, the firm name, the fund name, and the mark used with them are
        the property of KJC Capital. They may be quoted for the purposes of review or reporting
        but not reproduced in full without written permission.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Governing law</h3>
      <p>
        These terms are governed by the laws of the British Virgin Islands. Any dispute arising
        from a visitor's use of the site is subject to the exclusive jurisdiction of the courts
        of the British Virgin Islands.
      </p>
    </LegalPage>
  );
}
