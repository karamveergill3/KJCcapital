import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: "Risk warning",
    description:
      "Capital is at risk. Risk warning for the KJC Capital managed account programme, including the risks specific to each register.",
    alternates: { canonical: `/${lang}/legal/risk` },
    openGraph: { title: "Risk warning", url: `/${lang}/legal/risk` }
  };
}

export default function RiskPage() {
  return (
    <LegalPage label="Legal" title="Risk warning" updated="18 September 2026">
      <p className="lead">
        Capital committed to the KJC Capital programme is at risk. The programme is
        speculative, it is conducted in your own account, and it is possible to lose
        everything in that account.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Nature of the strategy</h3>
      <p>
        The programme pursues a leveraged trading strategy across precious metals, proprietary
        systematic strategies, digital assets, and select alternatives. Leveraged strategies
        magnify both gains and losses, and realised returns in any period may differ materially
        from the returns of the underlying markets traded. Past performance, whether of this
        programme or of any prior programme run by the firm&apos;s principals, is not a guide
        to future returns.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Risks specific to the registers</h3>
      <p>
        Precious metals carry no yield, and a position in them can fall in value for extended
        periods. Systematic strategies are fitted to conditions that may not recur, and a model
        that has worked can stop working without notice. Digital assets are volatile, are held
        with third-party venues and custodians whose failure could cause total loss of the
        amount held there, and are subject to a regulatory position that is unsettled and may
        change against you. Alternatives may be illiquid, may be difficult to value, and may
        not be realisable at the figure most recently shown on a statement.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">What the structure does and does not protect you from</h3>
      <p>
        Because the account is yours, the firm does not hold your money and cannot withdraw
        from the account. That protects you from the firm failing, from the firm misapplying
        your capital, and from being unable to get your money back without our cooperation. It
        does not protect you from losing money. A trading loss inside your own account is
        still your loss, and it is the ordinary and expected risk of the programme.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Your broker</h3>
      <p>
        Your capital is exposed to the broker holding it. The protections available to you,
        including any compensation scheme and any segregation of client assets, are the
        broker&apos;s and not the firm&apos;s, and they vary by broker and by jurisdiction.
        Satisfy yourself about the broker before funding an account, and understand what
        happens to your assets if that broker fails.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Liquidity</h3>
      <p>
        Committing capital to the programme is not a bank deposit. There is no notice period
        imposed by the firm and no gate, because the firm does not hold your money. Whether you
        can withdraw on a given day is a matter between you and your broker, and may be
        constrained by open positions and by the settlement terms of the instruments held.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Regulatory status</h3>
      <p>
        KJC Capital is based in the British Virgin Islands. Managing another person&apos;s
        account at the manager&apos;s discretion is a regulated activity in most jurisdictions,
        and the protections available to you depend on the basis on which the firm is permitted
        to conduct it. Ask the firm directly what that basis is, and read the client agreement,
        before granting any trading authority.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Not for United States persons</h3>
      <p>
        The programme is not offered to, and no authority will be accepted from, any person who
        is a United States person within the meaning of Regulation S under the Securities Act
        of 1933.
      </p>
    </LegalPage>
  );
}
