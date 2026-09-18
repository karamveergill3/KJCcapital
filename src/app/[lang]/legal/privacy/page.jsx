import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: "Privacy",
    alternates: { canonical: `/${lang}/legal/privacy` },
    openGraph: { title: "Privacy", url: `/${lang}/legal/privacy` }
  };
}

export default function PrivacyPage() {
  return (
    <LegalPage label="Legal" title="Privacy" updated="17 September 2026">
      <p>
        This notice describes what personal information the firm collects, why it collects it,
        and the choices available to the individual concerned.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">What is collected</h3>
      <p>
        For a visitor to this website, the firm records only the pages requested and the country
        of origin, in an aggregated form. For a prospective or admitted investor, the firm
        collects and retains the identity, address, source of funds, and tax residence
        information required to satisfy the fund's know-your-client and anti-money-laundering
        obligations.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Why it is retained</h3>
      <p>
        The information is retained to satisfy the firm's regulatory obligations, to administer
        the fund, and to communicate with the investor about their subscription. It is not
        used for marketing to third parties, and it is not sold.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">How long it is kept</h3>
      <p>
        Investor records are retained for the life of the investment and for at least seven
        years thereafter, as required by the anti-money-laundering framework of the British
        Virgin Islands. Website records are retained for no more than twenty-four months.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Access and correction</h3>
      <p>
        An investor may request a copy of the information the firm holds about them, and may
        request that inaccuracies be corrected. Such requests are addressed to a director at
        director@kjccapital.com.
      </p>
    </LegalPage>
  );
}
