import snapshotFeed from "@/lib/keystoneSnapshot.json" with { type: "json" };

// Live figures come from Keystone Monitor, the owner's MT5 tracker, through
// one read-only function there: site_feed(slug). The owner wants the portal to
// show the percentage gain and nothing else, so that is all the function
// returns: $KJC now, and $KJC at the end of each day Keystone sampled equity.
// No balance, deposit, profit or account detail leaves Keystone at all.
//
// Anything wrong with the feed (not configured, unreachable, an unexpected
// shape) gives null, and the portal falls back rather than showing a broken
// page or a stale number as if it were live.

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

/**
 * The same feed, read once from Keystone and committed with the time it was
 * taken. The portal shows it, labelled as a snapshot with that time, while the
 * live feed is not switched on. It is never presented as live.
 */
export function snapshotAccount() {
  const account = feedToAccount(snapshotFeed);
  return account ? { ...account, mode: "snapshot" } : null;
}

const number = (value) => (value === null || value === undefined || value === "" ? NaN : Number(value));

/** Turns the feed into what the portal draws: one percentage, and its history. */
export function feedToAccount(feed) {
  if (!feed || typeof feed !== "object" || Array.isArray(feed)) return null;
  const percent = number(feed.kjc);
  if (!Number.isFinite(percent)) return null;

  const history = (Array.isArray(feed.daily) ? feed.daily : [])
    .map((d) => ({ at: String(d?.day ?? ""), kjc: number(d?.kjc) }))
    .filter((h) => /^\d{4}-\d{2}-\d{2}/.test(h.at) && Number.isFinite(h.kjc));

  // The day's last sample can be a minute behind the account itself, so
  // today's point is the headline figure, and the two never differ.
  const asAt = feed.as_at ? String(feed.as_at) : null;
  const today = history[history.length - 1];
  if (today && asAt && today.at === asAt.slice(0, 10)) today.kjc = percent;

  return { mode: "live", asAt, percent, history };
}
