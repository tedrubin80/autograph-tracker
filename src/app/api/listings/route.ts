import { NextRequest, NextResponse } from "next/server";
import { getListings } from "@/db/queries";
import { LISTING_STATUSES, type ListingStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status");
  const status =
    statusParam && LISTING_STATUSES.includes(statusParam as ListingStatus)
      ? (statusParam as ListingStatus)
      : undefined;

  const rows = await getListings({
    status,
    shopId: params.get("shop") ?? undefined,
    q: params.get("q") ?? undefined,
    limit: Math.min(Number(params.get("limit") ?? 60) || 60, 200),
    offset: Number(params.get("offset") ?? 0) || 0,
  });

  return NextResponse.json({ listings: rows });
}
