import type { ShopConfig } from "./types";
import { createShopifyAdapter } from "./adapters/shopify";
import { createWooCommerceAdapter } from "./adapters/woocommerce";
import { createMagentoAdapter } from "./adapters/magento";

function notImplemented(shopName: string): () => Promise<never> {
  return async () => {
    throw new Error(
      `${shopName} has no working adapter yet. This entry exists as a placeholder — ` +
        `its site structure hasn't been inspected/verified, so it's disabled rather than ` +
        `shipping a guessed scraper that silently produces wrong data. See README "Adding a shop".`,
    );
  };
}

/**
 * Every tracked shop, in one place. `enabled: false` shops are skipped by
 * the scrape run but stay listed here so the gap is visible and the next
 * person can wire them up.
 */
export const shops: ShopConfig[] = [
  // --- Verified via search as real, live storefronts on Shopify's default
  // routing (/products/<handle>, /collections/<handle>), which exposes a
  // public /products.json catalog endpoint. Confirmed by URL pattern only —
  // this session's network egress couldn't reach these domains directly, so
  // field mappings should be spot-checked against a real `npm run scrape` run.
  {
    id: "zobie-productions",
    name: "Zobie Productions",
    homepageUrl: "https://shopzobie.com",
    platform: "shopify",
    enabled: true,
    scrape: createShopifyAdapter({ baseUrl: "https://shopzobie.com" }),
  },
  {
    id: "dark-parlor-originals",
    name: "Dark Parlor Originals",
    homepageUrl: "https://www.darkparlororiginals.com",
    platform: "shopify",
    enabled: true,
    note: 'Requested as "Dark Parlour" — official storefront name is Dark Parlor Originals.',
    scrape: createShopifyAdapter({ baseUrl: "https://www.darkparlororiginals.com" }),
  },
  {
    id: "swau",
    name: "SWAU",
    homepageUrl: "https://swau.com",
    platform: "shopify",
    enabled: true,
    scrape: createShopifyAdapter({
      baseUrl: "https://swau.com",
      collectionHandle: "autograph-signings",
    }),
  },
  {
    id: "mintych-authentics",
    name: "Mintych Authentics",
    homepageUrl: "https://www.mintychauthentics.com",
    platform: "shopify",
    enabled: true,
    note:
      'Requested as "Lulu Multi Props / Mintycheck" — closest verified match is Mintych ' +
      "Authentics (mintychauthentics.com), which sells Lulu Wilson autographs among others. " +
      "If a different shop was meant, update baseUrl here.",
    scrape: createShopifyAdapter({ baseUrl: "https://www.mintychauthentics.com" }),
  },
  {
    id: "csr-collectibles",
    name: "CSR Collectibles",
    homepageUrl: "https://csrcollectibles.com",
    platform: "woocommerce",
    enabled: true,
    note:
      "WooCommerce storefront — HTML scraping, not a JSON API. Selectors are WooCommerce " +
      "theme defaults, unverified against the live site from this environment. Scoped to " +
      "their own pre-order/consignment category page.",
    scrape: createWooCommerceAdapter({
      baseUrl: "https://csrcollectibles.com",
      listingPath: "/product-category/pre-order/consignment/",
    }),
  },
  {
    id: "celebrity-authentics",
    name: "Celebrity Authentics",
    homepageUrl: "https://celebrityauthentics.com",
    platform: "shopify",
    enabled: true,
    note:
      "Confirmed Shopify via search (/collections/<celeb>-pre-order/products/...). Pre-orders " +
      "are split across many per-celebrity collections rather than one shared one, so this " +
      "scrapes the full catalog instead of scoping to a single collectionHandle.",
    scrape: createShopifyAdapter({ baseUrl: "https://celebrityauthentics.com" }),
  },
  {
    id: "twin-cities-comics",
    name: "Twin Cities Comics",
    homepageUrl: "https://twincitiescomics.com",
    platform: "woocommerce",
    enabled: true,
    note: "Confirmed WooCommerce via search (/product/<slug>/, /product-category/private-signings/).",
    scrape: createWooCommerceAdapter({
      baseUrl: "https://twincitiescomics.com",
      listingPath: "/product-category/private-signings/",
    }),
  },

  // --- Big general dealers: real, well-known shops, but not yet inspected —
  // most likely run custom platforms (not Shopify/WooCommerce), so they need
  // a bespoke adapter rather than the generic ones above. Disabled until
  // someone verifies the actual markup/API and wires one up.
  //
  // Fanatics Authentic is NOT here: it's a fully custom, likely JS-rendered
  // platform, so it gets its own isolated Playwright worker instead of a fetch
  // -based adapter — see workers/fanatics/. That worker owns the
  // "fanatics-authentic" shop row directly; adding it here too would fight
  // over the same row on every scrape run.
  {
    id: "steiner-sports",
    name: "Steiner Sports",
    homepageUrl: "https://www.steinersports.com",
    platform: "custom",
    enabled: false,
    scrape: notImplemented("Steiner Sports"),
  },
  {
    id: "upper-deck-authenticated",
    name: "Upper Deck Authenticated",
    homepageUrl: "https://upperdeckstore.com",
    platform: "custom",
    enabled: true,
    note:
      "Signs point to Magento (.html category pages, an mcprod. subdomain) but this is " +
      "inferred, not confirmed, and the /memorabilia.html listing path is a guess at where " +
      "pre-order/signing inventory lives — check the first real run's listing count and the " +
      "shop's own error field, and adjust selectors/listingPath in shops.ts if it comes back empty.",
    scrape: createMagentoAdapter({
      baseUrl: "https://upperdeckstore.com",
      listingPath: "/memorabilia.html",
    }),
  },
  {
    id: "mab-memorabilia",
    name: "MAB (Memorabilia Authentication)",
    homepageUrl: "https://www.mabmemorabilia.com",
    platform: "custom",
    enabled: false,
    note: "Domain unconfirmed — verify before enabling.",
    scrape: notImplemented("MAB"),
  },
  {
    id: "gottahaveit",
    name: "GottaHaveIt / RR Auction",
    homepageUrl: "https://www.gottahaveitcollectibles.com",
    platform: "custom",
    enabled: false,
    note: "Auction-house model (bidding, not fixed pre-order) — status model may not fit as-is.",
    scrape: notImplemented("GottaHaveIt / RR Auction"),
  },
];
