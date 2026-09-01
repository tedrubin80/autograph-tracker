import { eq, and, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { shops as shopsTable, listings as listingsTable } from "@/db/schema";
import type { ShopConfig } from "./types";

async function upsertShopRow(shop: ShopConfig) {
  await db
    .insert(shopsTable)
    .values({
      id: shop.id,
      name: shop.name,
      homepageUrl: shop.homepageUrl,
      platform: shop.platform,
      enabled: shop.enabled,
    })
    .onConflictDoUpdate({
      target: shopsTable.id,
      set: {
        name: shop.name,
        homepageUrl: shop.homepageUrl,
        platform: shop.platform,
        enabled: shop.enabled,
      },
    });
}

type ShopResult = { shopId: string; listingCount: number; error?: string };

async function scrapeShop(shop: ShopConfig): Promise<ShopResult> {
  await upsertShopRow(shop);

  try {
    const raw = await shop.scrape();
    const now = new Date();

    for (const item of raw) {
      const id = `${shop.id}:${item.externalId}`;
      await db
        .insert(listingsTable)
        .values({
          id,
          shopId: shop.id,
          externalId: item.externalId,
          title: item.title,
          subjectName: item.subjectName ?? null,
          url: item.url,
          imageUrl: item.imageUrl ?? null,
          priceCents: item.priceCents ?? null,
          currency: item.currency ?? "USD",
          status: item.status,
          tags: (item.tags ?? []).join(","),
          eventDate: item.eventDate ?? null,
          firstSeenAt: now,
          lastSeenAt: now,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [listingsTable.shopId, listingsTable.externalId],
          set: {
            title: item.title,
            subjectName: item.subjectName ?? null,
            url: item.url,
            imageUrl: item.imageUrl ?? null,
            priceCents: item.priceCents ?? null,
            currency: item.currency ?? "USD",
            status: item.status,
            tags: (item.tags ?? []).join(","),
            eventDate: item.eventDate ?? null,
            lastSeenAt: now,
            isActive: true,
          },
        });
    }

    // Anything for this shop not seen in this run is presumed sold
    // through / removed. Skipped on an empty result, which is more likely a
    // transient failure than a genuinely empty catalog.
    if (raw.length > 0) {
      const seenIds = raw.map((r) => r.externalId);
      await db
        .update(listingsTable)
        .set({ isActive: false })
        .where(and(eq(listingsTable.shopId, shop.id), notInArray(listingsTable.externalId, seenIds)));
    }

    await db
      .update(shopsTable)
      .set({ lastScrapedAt: now, lastScrapeError: null })
      .where(eq(shopsTable.id, shop.id));

    return { shopId: shop.id, listingCount: raw.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(shopsTable)
      .set({ lastScrapedAt: new Date(), lastScrapeError: message })
      .where(eq(shopsTable.id, shop.id));
    return { shopId: shop.id, listingCount: 0, error: message };
  }
}

/** Runs a full scrape pass over the given shop list. Disabled shops are recorded but skipped. */
export async function runScrape(shopList: ShopConfig[]) {
  const results: ShopResult[] = [];

  for (const shop of shopList) {
    if (!shop.enabled) {
      await upsertShopRow(shop);
      continue;
    }
    results.push(await scrapeShop(shop));
  }

  return {
    ranAt: new Date().toISOString(),
    shopsScraped: results.length,
    results,
  };
}
