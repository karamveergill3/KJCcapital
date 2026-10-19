import { direction, money, signedPercent } from "@/lib/kjc";

const ARROW = { up: "▲", down: "▼", flat: "▬" };
const TONE = {
  up: "text-[var(--color-gain)]",
  down: "text-[var(--color-loss)]",
  flat: "text-[var(--color-ink-mute)]"
};

// The quote reads like a ticker: the symbol, the move, and a sign and arrow so
// the direction never rests on colour alone. The hero figure is sans, with
// proportional digits; the breakdown below is a column, so it is tabular.
export default function KjcQuote({ quote, currency, drawdown, copy, asAt }) {
  const dir = direction(quote.percent);
  const rows = [
    [copy.closed, money(quote.closed, currency, { signed: true })],
    [copy.floating, money(quote.floating, currency, { signed: true })],
    [copy.net, money(quote.net, currency, { signed: true })],
    [copy.equity, money(quote.capital + quote.net, currency)],
    [copy.drawdown, signedPercent(drawdown)]
  ];
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] items-start">
      <div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tracking-[0.12em] text-[var(--color-ink)]">{copy.symbol}</span>
          <span aria-hidden className="text-[var(--color-ink-faint)]">·</span>
          <span className="smallcaps">{copy.label}</span>
        </div>
        <p className={`font-sans font-semibold leading-none mt-4 text-6xl md:text-7xl ${TONE[dir]}`}>
          <span aria-hidden className="text-3xl md:text-4xl align-middle mr-3">{ARROW[dir]}</span>
          {signedPercent(quote.percent)}
        </p>
        <p className="font-sans text-base text-[var(--color-ink-soft)] mt-4">
          {money(quote.net, currency, { signed: true })} {copy.on} {money(quote.capital, currency)} {copy.deposited}
        </p>
        <p className="text-sm text-[var(--color-ink-mute)] mt-6 max-w-md leading-relaxed">{copy.explain}</p>
      </div>
      <div className="border border-[var(--color-rule)] bg-[var(--color-paper-white)] p-6 md:p-8">
        <table className="editorial w-full">
          <tbody>
            {rows.map(([term, value]) => (
              <tr key={term}>
                <th
                  scope="row"
                  className="!normal-case !tracking-normal !text-[0.95rem] !text-[var(--color-ink-mute)] !font-normal !py-3"
                >
                  {term}
                </th>
                <td className="tabular font-sans text-[var(--color-ink)] !py-3 text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="smallcaps mt-5 !normal-case !tracking-normal text-xs text-[var(--color-ink-mute)]">
          {copy.asAt} {asAt}, {copy.source}
        </p>
      </div>
    </div>
  );
}
