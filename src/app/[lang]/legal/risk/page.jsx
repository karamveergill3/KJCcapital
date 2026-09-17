import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Risk warning" };

export default function RiskPage() {
  return (
    <LegalPage label="Legal" title="Risk warning" updated="17 September 2026">
      <p className="lead">
        Capital invested in the KJC FX Growth Fund is at risk. An investment in the fund is
        speculative, and it is possible to lose the entire amount subscribed.
      </p>
      <h3 className="serif text-xl mt-10 mb-3 text-[var(--color-ink)]">Nature of the strategy</h3>
      <p>
        The fund pursues a leveraged trading strategy in the foreign-exchange markets.
        Leveraged strategies magnify both gains and losses, and the fund's realised returns
        in any period may differ materially from the returns of the underlying markets in
        which it trades. Past performance, whether of this fund or of any prior programme run
        by the firm's principals, is not a guide to future returns.
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
