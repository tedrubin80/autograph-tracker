import * as cheerio from "cheerio";
import type { RawListing } from "../types";
import { classifyStatus, guessSubjectName } from "../classify";
import { politeFetch, sleep } from "../http";

/**
 * Generic adapter for a Magento storefront using the default Luma theme's
 * category-grid markup. Like the WooCommerce adapter, there's no public
 * catalog JSON endpoint to rely on (Magento's GraphQL/REST APIs typically
 * need a store-specific setup to query anonymously), so this parses
 * rendered HTML — inherently more fragile, and these are Luma's default
 * class names, not verified against a live response from this environment.
 */
export function createMagentoAdapter(options: {
  baseUrl: string;
  /** Path to a category listing page, e.g. "/memorabilia.html". */
  listingPath: string;
  maxPages?: number;
  selectors?: Partial<typeof DEFAULT_SELECTORS>;
}): () => Promise<RawListing[]> {
  const base = options.baseUrl.replace(/\/+$/, "");
  const listingPath = options.listingPath.startsWith("/") ? options.listingPath : `/${options.listingPath}`;
  const maxPages = options.maxPages ?? 15;
  const selectors = { ...DEFAULT_SELECTORS, ...options.selectors };

  return async function scrapeMagento(): Promise<RawListing[]> {
    const listings: RawListing[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const separator = listingPath.includes("?") ? "&" : "?";
      const url = page === 1 ? `${base}${listingPath}` : `${base}${listingPath}${separator}p=${page}`;
      const res = await politeFetch(url).catch(() => null);
      if (!res) break;

      const html = await res.text();
      const $ = cheerio.load(html);
      const items = $(selectors.product);
      if (items.length === 0) break;

      items.each((_, el) => {
        const listing = mapProduct($, el, base, selectors);
        if (listing) listings.push(listing);
      });

      const hasNextPage = $(selectors.nextPageLink).length > 0;
      if (!hasNextPage) break;
      await sleep(750);
    }

    return listings;
  };
}

const DEFAULT_SELECTORS = {
  product: "li.item.product.product-item, .products-grid .product-item",
  title: ".product-item-link, .product.name a",
  link: "a.product-item-link, .product.name a",
  image: "img.product-image-photo, img",
  price: ".price-box .price, span.price",
  soldOutBadge: ".stock.unavailable",
  nextPageLink: "a.action.next",
};

function mapProduct(
  $: cheerio.CheerioAPI,
  el: unknown,
  base: string,
  selectors: typeof DEFAULT_SELECTORS,
): RawListing | null {
  const node = $(el as never);
  const title = node.find(selectors.title).first().text().trim();
  const href = node.find(selectors.link).first().attr("href");
  if (!title || !href) return null;

  const url = href.startsWith("http") ? href : `${base}${href.startsWith("/") ? "" : "/"}${href}`;
  const imageUrl =
    node.find(selectors.image).first().attr("data-src") ??
    node.find(selectors.image).first().attr("src") ??
    null;

  const priceText = node.find(selectors.price).first().text().trim();
  const priceMatch = priceText.match(/[\d,]+\.?\d*/);
  const priceCents = priceMatch ? Math.round(Number.parseFloat(priceMatch[0].replace(/,/g, "")) * 100) : null;

  const soldOut = node.find(selectors.soldOutBadge).length > 0;
  const externalId = slugFromUrl(url);

  return {
    externalId,
    title,
    subjectName: guessSubjectName(title),
    url,
    imageUrl,
    priceCents,
    currency: "USD",
    status: classifyStatus({ title, available: soldOut ? false : undefined }),
    tags: [],
    eventDate: null,
  };
}

function slugFromUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || trimmed;
}
