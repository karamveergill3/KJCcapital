export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    "unknown";
  const shortSha = sha.slice(0, 12);
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
  const deployedAt = process.env.VERCEL_DEPLOYMENT_ID
    ? new Date().toISOString()
    : null;
  return Response.json(
    {
      sha,
      shortSha,
      environment,
      deployedAt
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
