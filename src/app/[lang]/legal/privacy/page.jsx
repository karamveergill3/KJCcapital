import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: "Privacy",
    description: "How KJC Capital collects, uses and retains personal data submitted through this site.",
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
        of origin, in an aggregated form. For a prospective or existing client, the firm
        collects and retains the identity, address, source of funds, and tax residence
        information required to satisfy its know-your-client and anti-money-laundering
        obligations.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Why it is retained</h3>
      <p>
        The information is retained to satisfy the firm's regulatory obligations, to manage the
        client's account, and to communicate with the client about it. It is not used for
        marketing to third parties, and it is not sold.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">How long it is kept</h3>
      <p>
        Client records are retained for as long as the firm manages the account, and afterwards
        for the period the anti-money-laundering framework applicable to the firm requires.
        Website records are retained for no more than twenty-four months.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">What your broker holds</h3>
      <p>
        The account is opened in the client&apos;s own name with a broker, and that broker is a
        separate company with its own relationship with the client. It collects and holds its
        own records, including the identity documents it requires and the full history of the
        account, under its own privacy notice and its own regulator. This notice does not
        cover any of that, and the firm is not able to correct or erase anything held there.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Access and correction</h3>
      <p>
        A client may request a copy of the information the firm holds about them, and may
        request that inaccuracies be corrected. Such requests are addressed to a director at
        director@kjccapital.co.uk.
      </p>
    </LegalPage>
  );
}
