import type { ListingStatus } from "@/db/schema";

export type RawListing = {
  externalId: string;
  title: string;
  subjectName?: string | null;
  url: string;
  imageUrl?: string | null;
  priceCents?: number | null;
  currency?: string;
  status: ListingStatus;
  tags?: string[];
  eventDate?: Date | null;
};

export type ShopConfig = {
  id: string; // slug, primary key
  name: string;
  homepageUrl: string;
  platform: "shopify" | "woocommerce" | "custom";
  enabled: boolean;
  /** Notes on how this entry was identified / any caveats. Shown nowhere but the source, for maintainers. */
  note?: string;
  scrape: () => Promise<RawListing[]>;
};
