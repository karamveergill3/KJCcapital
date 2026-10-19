// Live figures come from Keystone Monitor, the owner's MT5 tracker, through
// one read-only function there: site_feed(slug). It returns aggregates for a
// single account named in Keystone's site_feeds table, and nothing that would
// identify the account or show the trades: no account number, server, broker,
// symbol or position.
//
// Anything wrong with the feed (not configured, unreachable, an unexpected
// shape) gives null, and the portal falls back to its labelled example account
// rather than showing a broken page or a stale number as if it were live.

const REVALIDATE_SECONDS = 60;

export function keystoneConfig(env = process.env) {
  const url = env.KEYSTONE_URL;
  const key = env.KEYSTONE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key, slug: env.KEYSTONE_FEED || "kjc" };
}

export async function fetchSiteFeed(config, fetchImpl = fetch) {
  if (!config) return null;
  try {
    const response = await fetchImpl(`${config.url}/rest/v1/rpc/site_feed`, {
      method: "POST",
      headers: {
        apikey: config.key,
        authorization: `Bearer ${config.key}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ p_slug: config.slug }),
      next: { revalidate: REVALIDATE_SECONDS }
    });
    if (!response.ok) return null;
    return feedToAccount(await response.json());
  } catch {
    return null;
  }
}

const number = (value) => (value === null || value === undefined || value === "" ? NaN : Number(value));

/**
 * Turns the feed into the shape the portal draws. MT5 equity includes broker
 * credit, which is not the client's money, so it comes off before anything is
 * measured. History carries two lines per day: closed profit alone, and $KJC
 * on equity for the days Keystone has an equity sample.
 */
export function feedToAccount(feed) {
  if (!feed || typeof feed !== "object") return null;
  const credit = number(feed.credit) || 0;
  const deposits = number(feed.deposits);
  const withdrawals = number(feed.withdrawals) || 0;
  const balance = number(feed.balance);
  const equity = number(feed.equity) - credit;
  if (![deposits, balance, equity].every(Number.isFinite) || deposits - withdrawals <= 0) return null;

  const history = (Array.isArray(feed.daily) ? feed.daily : [])
    .map((d) => {
      const capital = number(d.capital);
      const closed = number(d.closed);
      const dayEquity = number(d.equity);
      if (!(capital > 0) || !Number.isFinite(closed)) return null;
      return {
        at: String(d.day),
        closed: (closed / capital) * 100,
        kjc: Number.isFinite(dayEquity) ? ((dayEquity - capital) / capital) * 100 : null
      };
    })
    .filter(Boolean);

  // The last equity sample can be a minute behind the account itself. Today's
  // point is drawn from the same equity as the headline, so they never differ.
  const asAt = feed.as_at ? String(feed.as_at) : null;
  const today = history[history.length - 1];
  if (today && asAt && today.at === asAt.slice(0, 10)) {
    const capital = deposits - withdrawals;
    today.kjc = ((equity - capital) / capital) * 100;
  }

  return {
    live: true,
    currency: typeof feed.currency === "string" ? feed.currency : "USD",
    asAt,
    snapshot: { deposits, withdrawals, balance, equity },
    history
  };
}
