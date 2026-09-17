import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Disclosures" };

export default function DisclosuresPage() {
  return (
    <LegalPage label="Legal" title="Disclosures" updated="17 September 2026">
      <h3 className="serif text-xl mt-2 mb-3 text-[var(--color-ink)]">The firm</h3>
      <p>
        KJC Capital is the trading name of KJC Capital Ltd, a company incorporated in the
        British Virgin Islands and having its registered office at Craigmuir Chambers, Road
        Town, Tortola.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">The fund</h3>
      <p>
        The KJC FX Growth Fund is a segregated portfolio of KJC Capital Ltd, registered with
        the British Virgin Islands Financial Services Commission as an Incubator Fund under
        the Securities and Investment Business (Incubator and Approved Funds) Regulations 2015.
        The fund is subject to the investor cap of twenty, the asset ceiling of USD twenty
        million, and the two-year graduation requirement prescribed by the regulations.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Custody of capital</h3>
      <p>
        Investor capital is held in the fund's account with a bank authorised for that
        purpose in the British Virgin Islands. Trading capital allocated to the fund's broker
        is held in a segregated account in the name of the fund. Capital of the fund is not
        commingled with the operating capital of KJC Capital Ltd.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Fees</h3>
      <p>
        The fund charges a management fee of two per cent per annum, accrued daily on the net
        asset value of the fund and charged quarterly. A performance fee of twenty per cent is
        applied against each investor's individual high-water mark, reset quarterly. The
        subscription agreement sets out the calculation in full.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Conflicts of interest</h3>
      <p>
        The principals of KJC Capital hold a substantial personal position in the fund. The
        firm considers this the strongest available check on the manner in which the fund is
        run. Where the interests of the manager and of the investors nevertheless might
        diverge, the manager will act in the interests of the investors.
      </p>
    </LegalPage>
  );
}
