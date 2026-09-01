import * as cheerio from "cheerio";
import type { RawListing } from "../types";
import { classifyStatus, guessSubjectName } from "../classify";
import { politeFetch, sleep } from "../http";

/**
 * Generic adapter for a WordPress/WooCommerce storefront using the default
 * theme's shop-loop markup. Unlike the Shopify adapter, there's no stable
 * public JSON endpoint to rely on here, so this parses rendered HTML with
 * CSS selectors — which means it's inherently more fragile and WILL need
 * tuning per-shop when a theme deviates from WooCommerce's stock classes.
 *
 * NOTE: this environment's network egress is restricted, so these default
 * selectors were written from WooCommerce's documented default theme markup
 * and were NOT verified against a live response. Before relying on this for
 * a real shop, run it once, inspect the output, and adjust `selectors` (or
 * pass overrides) to match what the site actually renders.
 */
export function createWooCommerceAdapter(options: {
  baseUrl: string;
  /** Path to a shop/category listing page, e.g. "/shop/" or "/product-category/pre-order/". */
  listingPath: string;
  maxPages?: number;
  selectors?: Partial<typeof DEFAULT_SELECTORS>;
}): () => Promise<RawListing[]> {
  const base = options.baseUrl.replace(/\/+$/, "");
  const listingPath = options.listingPath.startsWith("/") ? options.listingPath : `/${options.listingPath}`;
  const maxPages = options.maxPages ?? 15;
  const selectors = { ...DEFAULT_SELECTORS, ...options.selectors };

  return async function scrapeWooCommerce(): Promise<RawListing[]> {
    const listings: RawListing[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1 ? `${base}${listingPath}` : `${base}${listingPath}page/${page}/`;
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
  product: "ul.products li.product",
  title: ".woocommerce-loop-product__title, h2.woocommerce-loop-product__title, h2",
  link: "a.woocommerce-LoopProduct-link, a.woocommerce-loop-product__link, a",
  image: "img",
  price: ".price bdi, .price",
  soldOutBadge: ".out-of-stock, .stock.out-of-stock",
  nextPageLink: "a.next.page-numbers",
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
