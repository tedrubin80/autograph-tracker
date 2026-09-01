import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(), // slug, e.g. "zobie-productions"
  name: text("name").notNull(),
  homepageUrl: text("homepage_url").notNull(),
  platform: text("platform").notNull(), // "shopify" | "woocommerce" | "custom"
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastScrapedAt: integer("last_scraped_at", { mode: "timestamp_ms" }),
  lastScrapeError: text("last_scrape_error"),
});

// Listing status. Kept as a plain string column (not a DB enum) so the
// schema stays portable if this ever moves off SQLite to Postgres.
export const LISTING_STATUSES = [
  "PRE_ORDER",
  "SIGNING_EVENT",
  "IN_STOCK",
  "SOLD_OUT",
  "UNKNOWN",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(), // shop's own product id/handle
    title: text("title").notNull(),
    subjectName: text("subject_name"), // best-effort parsed celebrity/subject name
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    priceCents: integer("price_cents"),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("UNKNOWN"),
    tags: text("tags").notNull().default(""), // comma-separated
    eventDate: integer("event_date", { mode: "timestamp_ms" }), // signing/event date if known
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    uniqueIndex("listings_shop_external_idx").on(table.shopId, table.externalId),
    index("listings_status_idx").on(table.status),
    index("listings_first_seen_idx").on(table.firstSeenAt),
  ],
);
