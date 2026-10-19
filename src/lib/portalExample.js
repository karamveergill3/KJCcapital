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
// one path for all three modes: a percentage and its history.
export function exampleAccount() {
  const kjc = (s) => kjcQuote(s).percent;
  const latest = account.snapshots[account.snapshots.length - 1];
  return {
    mode: "example",
    asAt: account.asAt,
    percent: kjc(latest),
    history: account.snapshots.map((s) => ({ at: s.at, kjc: kjc(s) }))
  };
}

// Weight is the share of the account's exposure in each register. A limit is a
// floor for the anchor and a cap for the rest; the numbers are examples of
// what a mandate sets, not the firm's terms.
export const registers = [
  { name: "Precious metals", note: "The anchor", weight: 58, limit: { min: 40 } },
  { name: "Algorithmic strategies", note: "Proprietary", weight: 24, limit: { max: 30 } },
  { name: "Digital assets", note: "Bounded", weight: 9, limit: { max: 10 } },
  { name: "Select alternatives", note: "By exception", weight: 4, limit: { max: 10 } }
];

// Rules marked example carry a number a real mandate would set per client.
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
  },
  {
    term: "Withdrawals",
    value: "Yours to instruct",
    detail: "Direct with your broker. The firm is not a step and cannot delay one."
  },
  {
    term: "Revoking the authority",
    value: "At any time",
    detail: "Direct with your broker, without the firm's agreement."
  },
  {
    term: "Risk per position",
    value: "1.00% of equity",
    detail: "The most any one position may put at risk.",
    example: true
  },
  {
    term: "Fees",
    value: "Per your agreement",
    detail: "Invoiced against your broker statement, never taken from the account by the firm."
  }
];

export const activity = [
  {
    at: "2026-09-24",
    kind: "Risk event",
    summary: "Gold fell on a stronger dollar. The metals position was held inside its limits and no stop was reached."
  },
  {
    at: "2026-09-15",
    kind: "Instruction",
    summary: "Added to the gold position on the pullback, within the metals range."
  },
  {
    at: "2026-09-02",
    kind: "Limit check",
    summary: "Quarterly check of the mandate limits. Every register inside its range."
  },
  {
    at: "2026-08-29",
    kind: "Instruction",
    summary: "Took profit on the systematic register's trend positions."
  },
  {
    at: "2026-08-12",
    kind: "Instruction",
    summary: "Reduced the digital-asset allocation to 9% ahead of a volatile week."
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

export const deskNote = {
  at: "2026-10-01",
  period: "September 2026",
  body: "The book was carried long gold for most of the month, and the open loss at the end of September is that position marked down after the dollar rallied in the final week. It sits inside the mandate's limits. The systematic register finished slightly ahead, and the digital-asset allocation was kept small."
};
