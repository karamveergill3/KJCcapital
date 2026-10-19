import { fetchSiteFeed, keystoneConfig } from "@/lib/keystone";
import { boardFigures } from "@/lib/kjcBoard";

// The $KJC board polls this once a minute so a visitor sitting on the portal
// sees the figures move without reloading. It returns the same aggregates the
// page draws, never more, and 503 when there is no live feed to read.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const account = await fetchSiteFeed(keystoneConfig());
  if (account?.mode !== "live") {
    return Response.json({ live: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(
    {
      live: true,
      asAt: account.asAt,
      currency: account.currency,
      figures: boardFigures(account.snapshot)
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } }
  );
}
