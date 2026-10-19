import test from "node:test";
import assert from "node:assert/strict";
import { feedToAccount, fetchSiteFeed, keystoneConfig } from "../src/lib/keystone.js";
import { kjcQuote } from "../src/lib/kjc.js";

// The shape site_feed returns, with the figures Keystone held for the tracked
// account when the feed was designed (19 October 2026).
const FEED = {
  currency: "USD",
  as_at: "2026-10-19T18:13:52.093+00:00",
  balance: 668518.35,
  equity: 583570.24,
  credit: 0,
  deposits: 1000000,
  withdrawals: 499989.8,
  opened_at: "2026-06-28T21:49:17.911+00:00",
  tracking_since: "2026-10-19T14:13:52.261+00:00",
  daily: [
    { day: "2026-06-30", closed: 2150.03, capital: 500010.2, equity: null },
    { day: "2026-10-16", closed: 168508.15, capital: 500010.2, equity: null },
    { day: "2026-10-19", closed: 168508.15, capital: 500010.2, equity: 583570.24 }
  ]
};

test("the feed becomes a $KJC quote measured on equity", () => {
  const account = feedToAccount(FEED);
  assert.equal(account.live, true);
  const q = kjcQuote(account.snapshot);
  assert.equal(Number(q.capital.toFixed(2)), 500010.2);
  assert.equal(Number(q.closed.toFixed(2)), 168508.15);
  assert.equal(Number(q.floating.toFixed(2)), -84948.11);
  assert.equal(Number(q.percent.toFixed(2)), 16.71);
});

test("history carries closed profit every day and $KJC only where equity was sampled", () => {
  const { history } = feedToAccount(FEED);
  assert.equal(history.length, 3);
  assert.equal(history[0].kjc, null);
  assert.equal(Number(history[1].closed.toFixed(2)), 33.7);
  assert.equal(Number(history[2].kjc.toFixed(2)), 16.71);
});

test("today's point matches the headline, not a sample a minute old", () => {
  const account = feedToAccount({ ...FEED, equity: 583366 });
  const headline = kjcQuote(account.snapshot).percent;
  assert.equal(account.history.at(-1).kjc, headline);
  assert.equal(Number(headline.toFixed(2)), 16.67);
});

test("broker credit is not the client's money", () => {
  const withCredit = feedToAccount({ ...FEED, equity: 593570.24, credit: 10000 });
  assert.equal(withCredit.snapshot.equity, 583570.24);
});

test("a missing or malformed feed gives null, never a half-drawn page", () => {
  assert.equal(feedToAccount(null), null);
  assert.equal(feedToAccount([]), null);
  assert.equal(feedToAccount({ ...FEED, equity: "not a number" }), null);
  assert.equal(feedToAccount({ ...FEED, deposits: 100, withdrawals: 100 }), null);
  assert.deepEqual(feedToAccount({ ...FEED, daily: "nope" }).history, []);
});

test("the feed is only read over https with both values set", () => {
  assert.equal(keystoneConfig({}), null);
  assert.equal(keystoneConfig({ KEYSTONE_URL: "https://x.supabase.co" }), null);
  assert.equal(keystoneConfig({ KEYSTONE_URL: "http://x.supabase.co", KEYSTONE_PUBLISHABLE_KEY: "k" }), null);
  assert.deepEqual(keystoneConfig({ KEYSTONE_URL: "https://x.supabase.co/", KEYSTONE_PUBLISHABLE_KEY: "k" }), {
    url: "https://x.supabase.co",
    key: "k",
    slug: "kjc"
  });
});

test("fetching calls site_feed and swallows every failure", async () => {
  const config = { url: "https://x.supabase.co", key: "k", slug: "kjc" };
  let seen;
  const ok = await fetchSiteFeed(config, async (url, init) => {
    seen = { url, init };
    return { ok: true, json: async () => FEED };
  });
  assert.equal(seen.url, "https://x.supabase.co/rest/v1/rpc/site_feed");
  assert.equal(JSON.parse(seen.init.body).p_slug, "kjc");
  assert.equal(ok.live, true);

  assert.equal(await fetchSiteFeed(null), null);
  assert.equal(await fetchSiteFeed(config, async () => ({ ok: false, json: async () => ({}) })), null);
  assert.equal(await fetchSiteFeed(config, async () => { throw new Error("offline"); }), null);
  assert.equal(await fetchSiteFeed(config, async () => ({ ok: true, json: async () => null })), null);
});
