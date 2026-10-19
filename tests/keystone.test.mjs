import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import snapshot from "../src/lib/keystoneSnapshot.json" with { type: "json" };
import { feedToAccount, fetchSiteFeed, keystoneFeedUrl, monthEnds, snapshotAccount } from "../src/lib/keystone.js";

const here = dirname(fileURLToPath(import.meta.url));

// The shape Keystone's public feed returns: the percentage gain now, the time
// it was taken, and the percentage over the account's life. Nothing else.
const FEED = {
  as_at: "2026-10-19T18:49:52.618+00:00",
  pct: 16.5852,
  series: [
    { at: "2026-10-19T18:45:54.963+00:00", pct: 16.4966 },
    { at: "2026-06-29T12:15:00+00:00", pct: 0.12 },
    { at: "2026-10-19T18:29:52.506+00:00", pct: 16.5694 }
  ]
};

test("the feed is Keystone's public route unless KEYSTONE_FEED_URL says otherwise", () => {
  assert.equal(keystoneFeedUrl({}), "https://keystone-monitor.vercel.app/api/feed/kjc");
  assert.equal(keystoneFeedUrl({ KEYSTONE_FEED_URL: "" }), "https://keystone-monitor.vercel.app/api/feed/kjc");
  assert.equal(keystoneFeedUrl({ KEYSTONE_FEED_URL: "https://example.test/api/feed/other" }), "https://example.test/api/feed/other");
});

test("an override is only read over https", () => {
  assert.equal(keystoneFeedUrl({ KEYSTONE_FEED_URL: "http://example.test/api/feed/kjc" }), null);
  assert.equal(keystoneFeedUrl({ KEYSTONE_FEED_URL: "not a url" }), null);
  assert.equal(keystoneFeedUrl({ KEYSTONE_FEED_URL: "ftp://example.test/feed" }), null);
});

test("fetching is a plain GET, cached for a minute, with no key", async () => {
  let seen;
  const account = await fetchSiteFeed("https://example.test/api/feed/kjc", async (url, init) => {
    seen = { url, init };
    return { ok: true, json: async () => FEED };
  });
  assert.equal(seen.url, "https://example.test/api/feed/kjc");
  assert.deepEqual(seen.init, { headers: { accept: "application/json" }, next: { revalidate: 60 } });
  assert.equal(account.mode, "live");
  assert.equal(account.percent, FEED.pct);
});

test("every failure gives null, never a half-drawn page", async () => {
  const url = "https://example.test/api/feed/kjc";
  assert.equal(await fetchSiteFeed(null), null);
  assert.equal(await fetchSiteFeed(url, async () => ({ ok: false, json: async () => FEED })), null);
  assert.equal(await fetchSiteFeed(url, async () => { throw new Error("offline"); }), null);
  assert.equal(await fetchSiteFeed(url, async () => ({ ok: true, json: async () => { throw new SyntaxError("not json"); } })), null);
  assert.equal(await fetchSiteFeed(url, async () => ({ ok: true, json: async () => null })), null);
  assert.equal(await fetchSiteFeed(url, async () => ({ ok: true, json: async () => ({ error: "no such feed" }) })), null);
});

test("the feed becomes one percentage, its time and its series", () => {
  const account = feedToAccount(FEED);
  assert.deepEqual(Object.keys(account).sort(), ["asAt", "mode", "percent", "series"]);
  assert.equal(account.mode, "live");
  assert.equal(account.percent, 16.5852);
  assert.equal(account.asAt, FEED.as_at);
});

test("the series comes oldest first and ends on the headline", () => {
  const { series, percent, asAt } = feedToAccount(FEED);
  assert.deepEqual(series.map((p) => p.kjc), [0.12, 16.5694, 16.4966, percent]);
  assert.deepEqual(series.at(-1), { at: asAt, kjc: percent });

  // A point taken at the same moment as the headline is not drawn twice.
  const caughtUp = feedToAccount({ ...FEED, series: [{ at: FEED.as_at, pct: 16.58 }] });
  assert.deepEqual(caughtUp.series, [{ at: FEED.as_at, kjc: 16.58 }]);

  // Nor is a headline older than the last point added after it.
  const ahead = feedToAccount({ ...FEED, series: [{ at: "2026-10-19T19:00:00Z", pct: 16.6 }] });
  assert.deepEqual(ahead.series, [{ at: "2026-10-19T19:00:00Z", kjc: 16.6 }]);
});

test("each instant appears once, the later entry winning", () => {
  const { series } = feedToAccount({
    ...FEED,
    series: [
      { at: "2026-10-19T10:00:00Z", pct: 1 },
      { at: "2026-10-19T10:00:00.000+00:00", pct: 2 },
      { at: "2026-10-19T12:00:00+02:00", pct: 3 }
    ]
  });
  assert.deepEqual(series.slice(0, -1), [{ at: "2026-10-19T12:00:00+02:00", kjc: 3 }]);
});

test("points are cut to their time and percentage, and bad ones dropped", () => {
  const { series } = feedToAccount({
    ...FEED,
    series: [
      { at: "2026-10-19T10:00:00Z", pct: 1, equity: 583154.5, balance: 668730.2 },
      { at: "2026-10-19T11:00:00Z", pct: "2.5" },
      { at: "2026-10-19", pct: 1 },
      { at: "2026-10-19T10:30:00Z", pct: null },
      { at: "2026-10-19T10:45:00Z", pct: "x" },
      { at: "yesterday", pct: 1 },
      null,
      "2026-10-19T10:00:00Z"
    ]
  });
  assert.deepEqual(series.slice(0, -1), [
    { at: "2026-10-19T10:00:00Z", kjc: 1 },
    { at: "2026-10-19T11:00:00Z", kjc: 2.5 }
  ]);
  for (const p of series) assert.deepEqual(Object.keys(p).sort(), ["at", "kjc"]);
});

test("a missing series still gives the headline as a single point", () => {
  for (const series of [undefined, "nope", {}, []]) {
    assert.deepEqual(feedToAccount({ ...FEED, series }).series, [{ at: FEED.as_at, kjc: FEED.pct }]);
  }
});

test("a feed without a valid headline gives null", () => {
  assert.equal(feedToAccount(null), null);
  assert.equal(feedToAccount([]), null);
  assert.equal(feedToAccount("16.5"), null);
  assert.equal(feedToAccount({ ...FEED, pct: "not a number" }), null);
  assert.equal(feedToAccount({ ...FEED, pct: null }), null);
  // The site's own name for the figure is not the feed's.
  assert.equal(feedToAccount({ as_at: FEED.as_at, kjc: 16.5852, series: [] }), null);
  assert.equal(feedToAccount({ ...FEED, as_at: null }), null);
  assert.equal(feedToAccount({ ...FEED, as_at: "2026-10-19" }), null);
  assert.equal(feedToAccount({ ...FEED, as_at: "2026-13-45T99:00:00Z" }), null);
});

// Number() reads all of these as a figure (0, 1, 5, 16 and so on), and none
// of them came from Keystone as one.
const NOT_FIGURES = [false, true, " ", "", [], [5], "0x10", "1e", "Infinity", {}, NaN, Infinity];

test("a headline that is not a number is refused, however Number() reads it", () => {
  for (const pct of NOT_FIGURES) {
    assert.equal(feedToAccount({ ...FEED, pct }), null, `a headline of ${JSON.stringify(pct)} was read as a figure`);
  }
  // A plain decimal written as text is still a figure.
  assert.equal(feedToAccount({ ...FEED, pct: "16.5852" }).percent, 16.5852);
  assert.equal(feedToAccount({ ...FEED, pct: "-3" }).percent, -3);
  assert.equal(feedToAccount({ ...FEED, pct: "1.5e1" }).percent, 15);
});

test("a point that is not a number is dropped, however Number() reads it", () => {
  for (const pct of NOT_FIGURES) {
    const { series } = feedToAccount({ ...FEED, series: [{ at: "2026-10-19T10:00:00Z", pct }] });
    assert.deepEqual(series, [{ at: FEED.as_at, kjc: FEED.pct }], `a point of ${JSON.stringify(pct)} was drawn`);
  }
});

test("the committed snapshot has the feed's shape and nothing else", () => {
  assert.deepEqual(Object.keys(snapshot).sort(), ["as_at", "pct", "series"]);
  assert.ok(snapshot.series.length > 10, "the snapshot should carry the measured readings");
  for (const p of snapshot.series) assert.deepEqual(Object.keys(p).sort(), ["at", "pct"]);
  const times = snapshot.series.map((p) => Date.parse(p.at));
  assert.deepEqual([...times].sort((a, b) => a - b), times, "the snapshot's series is not oldest first");
});

test("the snapshot is read as a snapshot, never as live", () => {
  const snap = snapshotAccount();
  assert.equal(snap.mode, "snapshot");
  assert.equal(snap.asAt, snapshot.as_at);
  assert.equal(snap.percent, snapshot.pct);
  assert.deepEqual(snap.series.at(-1), { at: snapshot.as_at, kjc: snapshot.pct });
});

test("the month table takes each UTC month's last reading and marks the current one", () => {
  const series = [
    { at: "2026-06-29T14:15:00+02:00", kjc: 0.5 },
    { at: "2026-06-30T12:15:00Z", kjc: 1.25 },
    // Still 31 July in UTC, though it is already 1 August in Frankfurt.
    { at: "2026-08-01T01:30:00+02:00", kjc: 3 },
    { at: "2026-08-31T12:15:00Z", kjc: -2 },
    { at: "2026-10-19T19:19:53.992+00:00", kjc: 16.63 }
  ];
  assert.deepEqual(monthEnds(series, new Date("2026-10-20T08:00:00Z")), [
    { month: "2026-06", kjc: 1.25, toDate: false },
    { month: "2026-07", kjc: 3, toDate: false },
    { month: "2026-08", kjc: -2, toDate: false },
    { month: "2026-10", kjc: 16.63, toDate: true }
  ]);
  assert.equal(monthEnds(series, new Date("2026-11-02T00:00:00Z")).at(-1).toDate, false);

  // Read at the data's own time, as the portal does, a feed that stopped
  // syncing on 19 October still marks October as to date in November.
  const asAt = series.at(-1).at;
  assert.equal(monthEnds(series, new Date(asAt)).at(-1).toDate, true);
  assert.deepEqual(monthEnds(series, new Date(asAt)).filter((m) => m.toDate).map((m) => m.month), ["2026-10"]);

  // The example's month ends are bare days.
  assert.deepEqual(monthEnds([{ at: "2025-09-30", kjc: 0 }, { at: "2025-10-31", kjc: 0.8 }], new Date("2026-10-19T00:00:00Z")), [
    { month: "2025-09", kjc: 0, toDate: false },
    { month: "2025-10", kjc: 0.8, toDate: false }
  ]);
  assert.deepEqual(monthEnds(undefined), []);
});

// Keystone owns the feed now; the website keeps no SQL of its own for it.
test("the old database function is gone from the website", async () => {
  await assert.rejects(access(resolve(here, "..", "supabase", "keystone", "site_feed.sql")));
});
