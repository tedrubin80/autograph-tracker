import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds; only honored on platforms that support it (e.g. Vercel Pro+)

/**
 * Triggers a scrape run over HTTP, for platforms with a cron feature that
 * can only hit a URL (e.g. Vercel Cron). Requires SCRAPE_SECRET to be set
 * and passed as `?secret=` or an `x-scrape-secret` header — this endpoint
 * fetches third-party sites and writes to the database, so it must not be
 * left open.
 *
 * A scrape across several shops can run long. If your host's function
 * timeout is short (most free tiers cap around 10s), prefer running
 * `npm run scrape` on a schedule from a host you control (a cron job,
 * GitHub Actions, Railway) instead of this endpoint. See README.
 */
export async function POST(request: NextRequest) {
  const configuredSecret = process.env.SCRAPE_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "SCRAPE_SECRET is not configured on the server; refusing to run." },
      { status: 503 },
    );
  }

  const provided = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-scrape-secret");
  if (provided !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shops } = await import("@/scraper/shops");
  const { runScrape } = await import("@/scraper/run-once");
  const result = await runScrape(shops);

  return NextResponse.json(result);
}
