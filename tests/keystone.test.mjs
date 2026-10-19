import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { feedToAccount, fetchSiteFeed, keystoneConfig } from "../src/lib/keystone.js";

const here = dirname(fileURLToPath(import.meta.url));

// The shape site_feed returns: the percentage gain now, and at the end of each
// day Keystone sampled equity. Nothing else.
const FEED = {
  as_at: "2026-10-19T18:49:52.618+00:00",
  kjc: 16.5852,
  daily: [
    { day: "2026-10-18", kjc: 16.1 },
    { day: "2026-10-19", kjc: 16.4966 }
  ]
};

test("the feed becomes one percentage and its history", () => {
  const account = feedToAccount(FEED);
  assert.equal(account.mode, "live");
  assert.equal(account.percent, 16.5852);
  assert.equal(account.asAt, FEED.as_at);
  assert.deepEqual(account.history.map((h) => h.at), ["2026-10-18", "2026-10-19"]);
});

test("today's point matches the headline, not a sample a minute old", () => {
  const { history, percent } = feedToAccount(FEED);
  assert.equal(history.at(-1).kjc, percent);
  assert.equal(history[0].kjc, 16.1);
});

test("a missing or malformed feed gives null, never a half-drawn page", () => {
  assert.equal(feedToAccount(null), null);
  assert.equal(feedToAccount([]), null);
  assert.equal(feedToAccount({ ...FEED, kjc: "not a number" }), null);
  assert.equal(feedToAccount({ ...FEED, kjc: null }), null);
  assert.deepEqual(feedToAccount({ ...FEED, daily: "nope" }).history, []);
  assert.deepEqual(feedToAccount({ ...FEED, daily: [{ day: "x", kjc: 1 }, { day: "2026-10-19", kjc: "y" }] }).history, []);
});

// The owner wants the percentage shown and nothing else, so the function in
// Keystone must not hand out money figures to the public key either.
test("the Keystone function returns percentages only", async () => {
  const sql = await readFile(resolve(here, "..", "supabase", "keystone", "site_feed.sql"), "utf8");
  const body = sql.slice(sql.indexOf("as $$"), sql.lastIndexOf("$$;"));
  const output = body.slice(body.indexOf("jsonb_build_object"));
  const keys = [...output.matchAll(/'([a-z_]+)',/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(keys)].sort(), ["as_at", "daily", "day", "kjc"]);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public, pg_temp/);
  assert.match(sql, /grant execute on function public\.site_feed\(text\) to anon;/);
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
  assert.equal(ok.mode, "live");

  assert.equal(await fetchSiteFeed(null), null);
  assert.equal(await fetchSiteFeed(config, async () => ({ ok: false, json: async () => ({}) })), null);
  assert.equal(await fetchSiteFeed(config, async () => { throw new Error("offline"); }), null);
  assert.equal(await fetchSiteFeed(config, async () => ({ ok: true, json: async () => null })), null);
});
