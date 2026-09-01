import type { RawListing } from "../types";
import { classifyStatus, guessSubjectName } from "../classify";
import { politeFetchJson, sleep } from "../http";

type ShopifyVariant = {
  price: string;
  available?: boolean;
};

type ShopifyProduct = {
  id: number;
  handle: string;
  title: string;
  tags: string[] | string;
  product_type?: string;
  variants: ShopifyVariant[];
  images?: { src: string }[];
  published_at?: string | null;
};

type ShopifyProductsResponse = {
  products: ShopifyProduct[];
};

/**
 * Generic adapter for any storefront running Shopify's default theme
 * routing (product URLs under /products/<handle>). Shopify exposes a public,
 * read-only /products.json endpoint for every storefront that hasn't
 * explicitly disabled it — this is the same catalog data the storefront
 * itself renders, just structured, so it's a much more robust source than
 * scraping rendered HTML.
 *
 * Options let you scope to one collection (e.g. a shop's "pre-order" or
 * "signings" collection) via /collections/<handle>/products.json, which is
 * both lighter and pre-filtered by the shop's own curation.
 */
export function createShopifyAdapter(options: {
  baseUrl: string;
  /** Collection handle to scope to, e.g. "pre-order". Omit to scrape the full catalog. */
  collectionHandle?: string;
  /** Safety cap on pagination so a misbehaving store can't loop forever. */
  maxPages?: number;
}): () => Promise<RawListing[]> {
  const base = options.baseUrl.replace(/\/+$/, "");
  const path = options.collectionHandle
    ? `/collections/${options.collectionHandle}/products.json`
    : `/products.json`;
  const maxPages = options.maxPages ?? 20;

  return async function scrapeShopify(): Promise<RawListing[]> {
    const listings: RawListing[] = [];
    let previousFirstId: number | null = null;

    for (let page = 1; page <= maxPages; page++) {
      const url = `${base}${path}?limit=250&page=${page}`;
      const data = await politeFetchJson<ShopifyProductsResponse>(url);
      const products = data.products ?? [];
      if (products.length === 0) break;

      // Some storefronts ignore an out-of-range (or any) `page` param and
      // just keep re-serving page 1 instead of an empty array — without this
      // check that loops to `maxPages` re-adding the same products.
      if (products[0].id === previousFirstId) break;
      previousFirstId = products[0].id;

      for (const product of products) {
        listings.push(mapProduct(base, product));
      }

      if (products.length < 250) break;
      await sleep(500);
    }

    return listings;
  };
}

function mapProduct(base: string, product: ShopifyProduct): RawListing {
  const tags = Array.isArray(product.tags)
    ? product.tags
    : product.tags
      ? product.tags.split(",").map((t) => t.trim())
      : [];

  const prices = product.variants
    .map((v) => Number.parseFloat(v.price))
    .filter((p) => Number.isFinite(p));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  const available = product.variants.some((v) => v.available === true);

  return {
    externalId: String(product.id),
    title: product.title,
    subjectName: guessSubjectName(product.title),
    url: `${base}/products/${product.handle}`,
    imageUrl: product.images?.[0]?.src ?? null,
    priceCents: minPrice !== null ? Math.round(minPrice * 100) : null,
    currency: "USD",
    status: classifyStatus({ title: product.title, tags, available }),
    tags,
    eventDate: null,
  };
}
