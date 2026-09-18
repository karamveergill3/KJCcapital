import LegalPage from "@/components/LegalPage";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: "Risk warning",
    description: "Capital is at risk. Risk warning for the KJC Growth Fund, a BVI Incubator Fund, including the risks specific to each register.",
    alternates: { canonical: `/${lang}/legal/risk` },
    openGraph: { title: "Risk warning", url: `/${lang}/legal/risk` }
  };
}

export default function RiskPage() {
  return (
    <LegalPage label="Legal" title="Risk warning" updated="17 September 2026">
      <p className="lead">
        Capital invested in the KJC Growth Fund is at risk. An investment in the fund is
        speculative, and it is possible to lose the entire amount subscribed.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Nature of the strategy</h3>
      <p>
        The fund pursues a leveraged trading strategy across precious metals, proprietary
        systematic strategies, digital assets, and select alternatives. Leveraged strategies
        magnify both gains and losses, and the fund&apos;s realised returns in any period may
        differ materially from the returns of the underlying markets in which it trades. Past
        performance, whether of this fund or of any prior programme run by the firm&apos;s
        principals, is not a guide to future returns.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Risks specific to the registers</h3>
      <p>
        Precious metals carry no yield, and a position in them can fall in value for extended
        periods. Systematic strategies are fitted to conditions that may not recur, and a model
        that has worked can stop working without notice. Digital assets are volatile, are held
        with third-party venues and custodians whose failure could cause total loss of the
        amount held there, and are subject to a regulatory position that is unsettled and may
        change against the fund. Alternatives may be illiquid, may be difficult to value, and
        may not be realisable at the figure most recently carried in the accounts.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Liquidity</h3>
      <p>
        A subscription to the fund is not a bank deposit. Capital is committed until the next
        redemption date following a thirty-day notice period. The fund does not offer intraday
        or on-demand redemption.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Regulatory status</h3>
      <p>
        The fund is registered in the British Virgin Islands as an Incubator Fund under the
        Securities and Investment Business (Incubator and Approved Funds) Regulations 2015.
        The Incubator regime is a light-touch category and does not require the appointment
        of a fund administrator or an external auditor. Investors should read the offering
        summary and the subscription agreement before subscribing.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Not for United States persons</h3>
      <p>
        The fund is not offered, and no subscription will be accepted, from any person who is
        a United States person within the meaning of Regulation S under the Securities Act of
        1933.
      </p>
    </LegalPage>
  );
}
