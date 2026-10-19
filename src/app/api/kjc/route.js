import { fetchSiteFeed, keystoneConfig } from "@/lib/keystone";

// The $KJC board polls this once a minute so a visitor sitting on the portal
// sees the figure move without reloading. It returns the percentage gain and
// the time it was taken, nothing else, and 503 when there is no live feed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const account = await fetchSiteFeed(keystoneConfig());
  if (account?.mode !== "live") {
    return Response.json({ live: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(
    { live: true, asAt: account.asAt, percent: account.percent },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } }
  );
}
