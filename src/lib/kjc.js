/**
 * $KJC is a client's own return, quoted like a ticker. It is measured on
 * equity, not balance: profit already closed counts, and so does any loss
 * still open in the account. A client who has banked 50,000 on 500,000 but is
 * carrying 25,000 of open drawdown sees +5.00%, the 25,000 that is actually
 * theirs if every position were closed now, not the +10.00% the balance shows.
 *
 * The inputs are the fields an MT5 account reports: balance (closed trades
 * only) and equity (balance plus floating profit or loss), with deposits and
 * withdrawals summed from the account's balance operations.
 */
export function kjcQuote({ deposits, withdrawals = 0, balance, equity }) {
  const capital = deposits - withdrawals;
  if (!(capital > 0)) throw new Error("kjcQuote: net deposits must be positive");
  const closed = balance - capital;
  const floating = equity - balance;
  const net = equity - capital;
  return { capital, closed, floating, net, percent: (net / capital) * 100 };
}

/** $KJC at each snapshot, oldest first. */
export function kjcHistory(snapshots) {
  return snapshots.map((s) => ({ at: s.at, percent: kjcQuote(s).percent }));
}

/**
 * The largest fall in equity from a previous high, as a negative percentage of
 * that high. Measured on equity for the same reason as the quote: an open loss
 * is a loss.
 */
export function maxDrawdown(snapshots) {
  let peak = -Infinity;
  let worst = 0;
  for (const { equity } of snapshots) {
    peak = Math.max(peak, equity);
    worst = Math.min(worst, ((equity - peak) / peak) * 100);
  }
  return worst;
}

// U+2212, not a hyphen: a minus sign is the width of a plus, so signed
// figures line up and never read as a dash.
const MINUS = "−";

export function signedPercent(value, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  const sign = rounded > 0 ? "+" : rounded < 0 ? MINUS : "";
  return `${sign}${Math.abs(rounded).toFixed(digits)}%`;
}

export function money(value, currency = "USD", { signed = false } = {}) {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value));
  if (!signed) return value < 0 ? `${MINUS}${formatted}` : formatted;
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : rounded < 0 ? MINUS : ""}${formatted}`;
}

/** "up", "down" or "flat", from the figure as displayed, so a quote of +0.00% is flat. */
export function direction(percent, digits = 2) {
  const rounded = Number(percent.toFixed(digits));
  return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
}

// Dates arrive as ISO days. Formatting them in UTC keeps 30 September from
// becoming 29 September on a server west of Greenwich.
export function longDate(iso) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
}

export function shortMonth(iso) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
}
