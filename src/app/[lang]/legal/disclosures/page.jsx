import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: "Disclosures",
    description: "Regulatory disclosures for KJC Capital and its managed account programme.",
    alternates: { canonical: `/${lang}/legal/disclosures` },
    openGraph: { title: "Disclosures", url: `/${lang}/legal/disclosures` }
  };
}

export default function DisclosuresPage() {
  return (
    <LegalPage label="Legal" title="Disclosures" updated="18 September 2026">
      <h3 className="serif text-xl mt-2 mb-3 text-[var(--color-ink)]">The firm</h3>
      <p>
        KJC Capital is the trading name of KJC Capital Ltd, a company incorporated in the
        British Virgin Islands and having its registered office at Craigmuir Chambers, Road
        Town, Tortola.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">What the firm does</h3>
      <p>
        KJC Capital manages accounts belonging to its clients. It does not operate a fund, does
        not issue units or shares, and does not pool one client&apos;s capital with
        another&apos;s. Each engagement is a separate account, held by the client, traded by the
        firm under an authority the client grants. The terms of each engagement are set out in
        the client agreement, which is provided on introduction and prevails over anything on
        this site.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Custody of capital</h3>
      <p>
        KJC Capital does not hold client money and does not take custody of client assets. A
        client&apos;s capital sits in an account opened with a broker in that client&apos;s own
        name, under the client&apos;s own credentials, and the broker is the custodian. The
        firm is granted a limited authority to place trades in the account. That authority does
        not extend to withdrawing, transferring, or pledging assets, or to changing the
        ownership of the account, and the client may revoke it directly with the broker at any
        time.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Fees</h3>
      <p>
        The fee basis is agreed in the client agreement before any trading authority is
        granted, and is not varied during an engagement without the client&apos;s written
        consent. Because the firm has no authority to move money out of a client&apos;s
        account, it cannot deduct its own fees from that account on its own initiative.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Conflicts of interest</h3>
      <p>
        The principals of KJC Capital run the same programme on their own capital, in their own
        accounts. The firm considers this the strongest available check on the manner in which
        the programme is run. Because accounts are separate rather than pooled, orders for
        different accounts may be filled at different prices; the firm allocates and sequences
        orders on a stated basis rather than at its discretion after the fact. Where the
        interests of the manager and of a client might nevertheless diverge, the manager will
        act in the interests of the client.
      </p>
    </LegalPage>
  );
}
