import { direction, kjcQuote, money, signedPercent } from "@/lib/kjc";

/**
 * Everything the $KJC board shows, from one account snapshot. Percentages are
 * all of net deposits, so they add up: closed return plus open drawdown is
 * $KJC.
 */
export function boardFigures(snapshot) {
  const q = kjcQuote(snapshot);
  return {
    percent: q.percent,
    net: q.net,
    closed: q.closed,
    floating: q.floating,
    capital: q.capital,
    equity: snapshot.equity,
    balance: snapshot.balance,
    closedPercent: (q.closed / q.capital) * 100,
    openPercent: (q.floating / q.capital) * 100
  };
}

const ARROW = { up: "▲", down: "▼", flat: "" };

function withArrow(text, tone) {
  return ARROW[tone] ? `${ARROW[tone]} ${text}` : text;
}

/**
 * The tape, in reading order. Each item carries its tone, so a gain reads
 * green and a loss red, and an arrow so the direction never rests on colour.
 */
export function tapeItems(f, currency, copy) {
  const tone = (v) => direction(v);
  const moneyTone = (v) => (Math.round(v * 100) > 0 ? "up" : Math.round(v * 100) < 0 ? "down" : "flat");
  return [
    { key: "kjc", term: copy.symbol, value: withArrow(signedPercent(f.percent), tone(f.percent)), tone: tone(f.percent) },
    { key: "net", term: copy.net, value: money(f.net, currency, { signed: true }), tone: moneyTone(f.net) },
    { key: "closed", term: copy.closed, value: money(f.closed, currency, { signed: true }), tone: moneyTone(f.closed) },
    {
      key: "floating",
      term: copy.floating,
      value: withArrow(money(f.floating, currency, { signed: true }), moneyTone(f.floating)),
      tone: moneyTone(f.floating)
    },
    { key: "closedPercent", term: copy.closedReturn, value: signedPercent(f.closedPercent), tone: tone(f.closedPercent) },
    { key: "openPercent", term: copy.openDrawdown, value: signedPercent(f.openPercent), tone: tone(f.openPercent) },
    { key: "equity", term: copy.equity, value: money(f.equity, currency), tone: "flat" },
    { key: "balance", term: copy.balance, value: money(f.balance, currency), tone: "flat" },
    { key: "capital", term: copy.capital, value: money(f.capital, currency), tone: "flat" }
  ];
}

/**
 * Sparkline paths for several series on one shared scale, in a w x h box, so
 * two lines can be compared by height. Nulls are skipped. A series with one
 * point draws no line but still reports where that point sits, so it can be
 * marked with a dot.
 */
export function sparkLines(seriesList, { w = 160, h = 40, pad = 3 } = {}) {
  const all = seriesList.flatMap((s) => s.filter((v) => v !== null && Number.isFinite(v)));
  const length = Math.max(0, ...seriesList.map((s) => s.length));
  if (!all.length || length < 2) return seriesList.map(() => ({ d: null, last: null }));
  const [y0, y1] = [Math.min(...all, 0), Math.max(...all, 0)];
  const sx = (i) => pad + (i / (length - 1)) * (w - pad * 2);
  const sy = (y) => h - pad - ((y - y0) / (y1 - y0 || 1)) * (h - pad * 2);
  return seriesList.map((series) => {
    const pts = series.map((v, i) => [i, v]).filter(([, v]) => v !== null && Number.isFinite(v));
    if (!pts.length) return { d: null, last: null };
    const d = pts.length > 1 ? pts.map(([x, y], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join(" ") : null;
    const [lx, ly] = pts[pts.length - 1];
    return { d, last: { x: Number(sx(lx).toFixed(1)), y: Number(sy(ly).toFixed(1)) } };
  });
}
