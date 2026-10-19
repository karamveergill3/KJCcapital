export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    "unknown";
  const shortSha = sha.slice(0, 12);
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
  // Stamped once by next.config.mjs when the build ran. Reading the clock here
  // reported the time of each request instead.
  const deployedAt = process.env.BUILD_TIME || null;
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
