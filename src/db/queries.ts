import { and, desc, eq, like, or, SQL } from "drizzle-orm";
import { db } from "./client";
import { listings, shops, type ListingStatus } from "./schema";

export type ListingFilters = {
  status?: ListingStatus;
  shopId?: string;
  q?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function getListings(filters: ListingFilters = {}) {
  const conditions: SQL[] = [];

  if (filters.status) conditions.push(eq(listings.status, filters.status));
  if (filters.shopId) conditions.push(eq(listings.shopId, filters.shopId));
  if (filters.activeOnly ?? true) conditions.push(eq(listings.isActive, true));
  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    const clause = or(like(listings.title, term), like(listings.subjectName, term));
    if (clause) conditions.push(clause);
  }

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      subjectName: listings.subjectName,
      url: listings.url,
      imageUrl: listings.imageUrl,
      priceCents: listings.priceCents,
      currency: listings.currency,
      status: listings.status,
      tags: listings.tags,
      eventDate: listings.eventDate,
      firstSeenAt: listings.firstSeenAt,
      lastSeenAt: listings.lastSeenAt,
      shopId: listings.shopId,
      shopName: shops.name,
      shopUrl: shops.homepageUrl,
    })
    .from(listings)
    .innerJoin(shops, eq(listings.shopId, shops.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(listings.firstSeenAt))
    .limit(filters.limit ?? 60)
    .offset(filters.offset ?? 0);

  return rows;
}

export async function getShopsWithCounts() {
  return db
    .select({
      id: shops.id,
      name: shops.name,
      homepageUrl: shops.homepageUrl,
      enabled: shops.enabled,
      lastScrapedAt: shops.lastScrapedAt,
      lastScrapeError: shops.lastScrapeError,
    })
    .from(shops)
    .orderBy(shops.name);
}
