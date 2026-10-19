import snapshotFeed from "@/lib/keystoneSnapshot.json" with { type: "json" };

// Live figures come from Keystone Monitor, the owner's MT5 tracker, through
// its public feed: one GET that answers for the one account Keystone's allow
// list names. The owner wants the portal to show the percentage gain and
// nothing else, so that is all the feed carries: $KJC now, with the time it
// was taken, and $KJC over the account's whole life, oldest first (Keystone
// calls the figure "pct", since its code never names this site). No
// balance, deposit, profit or account detail leaves Keystone at all, and the
// site needs no key and no database grant to read it.
//
// Before Keystone began sampling equity, Keystone rebuilds the history from
// the account's trades, with open positions valued at the European Central
// Bank's daily reference rates, an estimate; from the first sample on, the
// points are measured.
//
// Anything wrong with the feed (unreachable, an unexpected shape) gives null,
// and the portal falls back rather than showing a broken page or a stale
// number as if it were live.

const DEFAULT_FEED_URL = "https://keystone-monitor.vercel.app/api/feed/kjc";
const REVALIDATE_SECONDS = 60;

/** The feed's address: KEYSTONE_FEED_URL when set (https only), else Keystone's own. */
export function keystoneFeedUrl(env = process.env) {
  const url = env.KEYSTONE_FEED_URL;
  if (!url) return DEFAULT_FEED_URL;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function fetchSiteFeed(url, fetchImpl = fetch) {
  if (!url) return null;
  try {
    const response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS }
    });
    if (!response.ok) return null;
    return feedToAccount(await response.json());
  } catch {
    return null;
  }
}

/**
 * The same feed, read once from Keystone and committed with the time it was
 * taken. The portal shows it, labelled as a snapshot with that time, while the
 * live feed is not answering. It is never presented as live.
 */
export function snapshotAccount() {
  const account = feedToAccount(snapshotFeed);
  return account ? { ...account, mode: "snapshot" } : null;
}

// A figure is a number, or a plain decimal written as text. Anything else is
// not a reading, however Number() would take it: true, [5], " " and "0x10"
// would otherwise come out as 1, 5, 0 and 16.
const DECIMAL = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;
const number = (value) =>
  typeof value === "number" ? value : typeof value === "string" && DECIMAL.test(value) ? Number(value) : NaN;

// A point is a full ISO time, not a bare day, so two points never share one.
const timeOf = (at) => (/^\d{4}-\d{2}-\d{2}T/.test(at) ? Date.parse(at) : NaN);

/** Turns the feed into what the portal draws: one percentage, when it was taken, and its history. */
export function feedToAccount(feed) {
  if (!feed || typeof feed !== "object" || Array.isArray(feed)) return null;
  const percent = number(feed.pct);
  const asAt = typeof feed.as_at === "string" ? feed.as_at : "";
  if (!Number.isFinite(percent) || !Number.isFinite(timeOf(asAt))) return null;

  // Oldest first, one point per instant (the later one in the feed wins), and
  // each point cut down to its time and its percentage.
  const byTime = new Map();
  for (const p of Array.isArray(feed.series) ? feed.series : []) {
    const at = String(p?.at ?? "");
    const kjc = number(p?.pct);
    const t = timeOf(at);
    if (Number.isFinite(t) && Number.isFinite(kjc)) byTime.set(t, { at, kjc });
  }
  const series = [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p);

  // Equity is sampled every quarter of an hour or so and the account itself
  // more often, so the line ends on the headline figure rather than short of it.
  if (!series.length || timeOf(asAt) > timeOf(series[series.length - 1].at)) {
    series.push({ at: asAt, kjc: percent });
  }

  return { mode: "live", asAt, percent, series };
}

/**
 * One row per UTC month the series touches, oldest first: the month
 * ("2026-10") and the last $KJC in it. The month that `now` falls in is not
 * over yet, so it is marked as to date. The portal passes the time its data
 * was taken, not the clock, so a stale feed or snapshot still marks its last
 * month as unfinished.
 */
export function monthEnds(series, now = new Date()) {
  const current = now.toISOString().slice(0, 7);
  const byMonth = new Map();
  for (const p of Array.isArray(series) ? series : []) {
    // A time is read in UTC whatever offset it was written with; a bare day
    // (the example's month ends) is its own month.
    const at = String(p?.at ?? "");
    const t = timeOf(at);
    const month = Number.isFinite(t) ? new Date(t).toISOString().slice(0, 7) : at.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month) && Number.isFinite(p?.kjc)) byMonth.set(month, p.kjc);
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([month, kjc]) => ({ month, kjc, toDate: month === current }));
}
