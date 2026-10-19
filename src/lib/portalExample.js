import { kjcQuote } from "@/lib/kjc";

// The account the portal shows until a live feed is connected. Every figure
// here is invented to show the layout, and the page says so above the fold.
// The last snapshot is the owner's own worked example: 50,000 closed profit on
// 500,000 deposited, with 25,000 of open drawdown, so $KJC reads +5.00%.
//
// The snapshot fields are the ones an MT5 account reports, so a live feed can
// replace this object without the page changing shape.
export const ILLUSTRATIVE = true;

export const account = {
  currency: "USD",
  asAt: "2026-09-30",
  snapshots: [
    { at: "2025-09-30", deposits: 500000, balance: 500000, equity: 500000 },
    { at: "2025-10-31", deposits: 500000, balance: 503000, equity: 504000 },
    { at: "2025-11-30", deposits: 500000, balance: 508500, equity: 509500 },
    { at: "2025-12-31", deposits: 500000, balance: 510000, equity: 506000 },
    { at: "2026-01-31", deposits: 500000, balance: 512500, equity: 513500 },
    { at: "2026-02-28", deposits: 500000, balance: 518000, equity: 519500 },
    { at: "2026-03-31", deposits: 500000, balance: 521000, equity: 515500 },
    { at: "2026-04-30", deposits: 500000, balance: 523500, equity: 524000 },
    { at: "2026-05-31", deposits: 500000, balance: 530000, equity: 531000 },
    { at: "2026-06-30", deposits: 500000, balance: 536000, equity: 537000 },
    { at: "2026-07-31", deposits: 500000, balance: 542000, equity: 544500 },
    { at: "2026-08-31", deposits: 500000, balance: 547000, equity: 548000 },
    { at: "2026-09-30", deposits: 500000, balance: 550000, equity: 525000 }
  ]
};

// The example in the shape feedToAccount gives the live feed, so the page has
// one path for all three modes: a percentage and its series, one point per
// month end.
export function exampleAccount() {
  const kjc = (s) => kjcQuote(s).percent;
  const latest = account.snapshots[account.snapshots.length - 1];
  return {
    mode: "example",
    asAt: account.asAt,
    percent: kjc(latest),
    series: account.snapshots.map((s) => ({ at: s.at, kjc: kjc(s) }))
  };
}

// Weight is the share of the account's exposure in each register: forex at
// the core, stocks alongside it. A limit is a floor for the core and a cap
// for the rest. The numbers are examples of what a mandate sets, not the
// firm's terms.
export const registers = [
  { name: "Forex", note: "The core", weight: 68, limit: { min: 50 } },
  { name: "Stocks", note: "Equities and indices", weight: 27, limit: { max: 40 } }
];

// What the authority is, and whose the account is. The rest of the terms live
// in the client agreement.
export const rules = [
  {
    term: "Trading authority",
    value: "Trade only",
    detail: "The firm can place trades in the account. It cannot withdraw, transfer or pledge anything in it."
  },
  {
    term: "Account holder",
    value: "You",
    detail: "Opened with your broker, in your name, under your own credentials."
  }
];

// The account's administrative record. It never shows a trade: no order,
// position, entry, exit or profit taken appears here, and tests/portal.test.mjs
// fails if one does.
export const activity = [
  {
    at: "2026-10-01",
    kind: "Statement",
    summary: "September statement received from your broker and checked against the account."
  },
  {
    at: "2026-09-30",
    kind: "Limit check",
    summary: "Month-end check of the mandate limits. Every register inside its range."
  },
  {
    at: "2026-09-02",
    kind: "Review",
    summary: "Annual mandate review completed. No change to your limits."
  },
  {
    at: "2026-07-03",
    kind: "Fees",
    summary: "Second-quarter fee invoiced against your broker statement."
  },
  {
    at: "2026-06-30",
    kind: "Notice",
    summary: "Notice issued: your annual mandate review falls in September."
  }
];

export const fees = [
  {
    period: "Q3 2026",
    description: "Quarterly fee",
    amount: 1250,
    statementLine: "FEE-2026-Q3",
    status: "Invoiced"
  },
  {
    period: "Q2 2026",
    description: "Quarterly fee",
    amount: 1250,
    statementLine: "FEE-2026-Q2",
    status: "Paid"
  }
];

export const documents = [
  { title: "Client agreement", kind: "Agreement", at: "2025-09-02" },
  { title: "Mandate schedule", kind: "Mandate", at: "2025-09-02" },
  { title: "Broker statement, September 2026", kind: "Statement", at: "2026-10-01" },
  { title: "Fee invoice, Q2 2026", kind: "Invoice", at: "2026-07-03" }
];

export const notices = [
  {
    at: "2026-09-01",
    title: "Desk notes move to the first week of the month",
    acknowledged: true
  },
  {
    at: "2026-06-30",
    title: "Your annual mandate review falls in September",
    acknowledged: true
  }
];

// The desk note is about the news that moved the markets, not about what the
// desk did in them.
export const deskNote = {
  at: "2026-10-01",
  period: "September 2026",
  body: "A month led by the central banks. Rate decisions on both sides of the Atlantic set the tone for the dollar, and the major currency pairs moved on every shift in expectations for the pace of cuts. Inflation and jobs data drove the rest of the month, while equity markets followed company guidance as closely as policy. In the month ahead: the US jobs report, inflation figures in the major economies, and the start of the third-quarter earnings season."
};
