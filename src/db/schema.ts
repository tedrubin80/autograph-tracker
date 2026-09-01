import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const shops = pgTable("shops", {
  id: text("id").primaryKey(), // slug, e.g. "zobie-productions"
  name: text("name").notNull(),
  homepageUrl: text("homepage_url").notNull(),
  platform: text("platform").notNull(), // "shopify" | "woocommerce" | "custom"
  enabled: boolean("enabled").notNull().default(true),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  lastScrapeError: text("last_scrape_error"),
});

// Listing status. Kept as a plain string column (not a DB enum) so adding a
// new status never requires a migration that touches an enum type.
export const LISTING_STATUSES = [
  "PRE_ORDER",
  "SIGNING_EVENT",
  "IN_STOCK",
  "SOLD_OUT",
  "UNKNOWN",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const listings = pgTable(
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
    eventDate: timestamp("event_date", { withTimezone: true }), // signing/event date if known
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("listings_shop_external_idx").on(table.shopId, table.externalId),
    index("listings_status_idx").on(table.status),
    index("listings_first_seen_idx").on(table.firstSeenAt),
  ],
);
