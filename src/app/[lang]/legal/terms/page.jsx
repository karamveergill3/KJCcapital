import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage label="Legal" title="Terms of use" updated="17 September 2026">
      <p>
        These terms govern the use of the KJC Capital website by any visitor. They are not the
        terms on which the KJC FX Growth Fund is offered; the offering terms are set out in the
        subscription agreement furnished to prospective investors by introduction.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Nature of this website</h3>
      <p>
        The site is informational. Nothing on it constitutes an offer to the public, an
        invitation to subscribe, a recommendation, or investment advice. The fund is
        available only to persons the firm has satisfied itself are eligible to invest under
        the Incubator Fund regime, and only by direct introduction.
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
