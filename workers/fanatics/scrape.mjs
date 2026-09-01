// Standalone scraper for Fanatics Authentic, run as its own Railway service.
//
// Fanatics Authentic runs on a fully custom platform (URLs look like
// `o-1276+z-947736231-113824224`, not Shopify/WooCommerce/Magento), and this
// environment has no way to inspect its actual rendered markup. Rather than
// fabricate CSS selectors for a platform with zero known structure, this
// looks for schema.org JSON-LD (Product / ItemList) — a standardized,
// widely-used SEO data format many large storefronts embed regardless of
// platform — and only writes listings when it finds real structured data.
// If a page has none, it logs diagnostics and does nothing destructive, so a
// bad run never overwrites good data with nothing.
//
// This will very likely need a second pass once real logs come back: check
// the diagnostic output (page title, JSON-LD block count, candidate element
// counts) and adjust START_URL / extraction below accordingly.

import { chromium } from "playwright";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[fanatics] DATABASE_URL is not set.");
  process.exit(1);
}

// Best guess at a relevant starting point — search turned up this as a real,
// existing category URL, but Fanatics doesn't appear to separate "pre-order"
// or "upcoming signing" inventory the way the boutique autograph shops do,
// so this is broad memorabilia, not a targeted pre-order/signing feed.
// Worth revisiting once someone can browse the site directly.
const START_URL =
  process.env.FANATICS_START_URL ??
  "https://www.fanaticsauthentic.com/mlb-authentic/o-1276+z-947736231-113824224";

const SHOP_ID = "fanatics-authentic";
const USER_AGENT =
  "AutographTrackerBot/0.1 (+https://github.com/tedrubin80/autograph-tracker; polite, low-frequency)";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function upsertShop({ lastScrapeError = null } = {}) {
  await pool.query(
    `insert into shops (id, name, homepage_url, platform, enabled, last_scraped_at, last_scrape_error)
     values ($1, $2, $3, $4, true, now(), $5)
     on conflict (id) do update set
       name = excluded.name,
       homepage_url = excluded.homepage_url,
       platform = excluded.platform,
       enabled = true,
       last_scraped_at = now(),
       last_scrape_error = excluded.last_scrape_error`,
    [SHOP_ID, "Fanatics Authentic", "https://www.fanaticsauthentic.com", "custom", lastScrapeError],
  );
}

function classifyAvailability(availability, text) {
  const a = (availability ?? "").toLowerCase();
  const t = (text ?? "").toLowerCase();
  if (a.includes("preorder") || t.includes("pre-order") || t.includes("preorder")) return "PRE_ORDER";
  if (t.includes("signing")) return "SIGNING_EVENT";
  if (a.includes("outofstock") || a.includes("soldout") || t.includes("sold out")) return "SOLD_OUT";
  if (a.includes("instock") || a.includes("limitedavailability")) return "IN_STOCK";
  return "UNKNOWN";
}

function priceToCents(price) {
  const n = typeof price === "string" ? Number.parseFloat(price) : price;
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Extract schema.org Product entries from any JSON-LD blocks on the page. */
function extractProductsFromJsonLd(blocks) {
  const products = [];
  for (const raw of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      collectProducts(node, products);
    }
  }
  return products;
}

function collectProducts(node, out) {
  if (!node || typeof node !== "object") return;
  if (node["@type"] === "Product") out.push(node);
  if (Array.isArray(node.itemListElement)) {
    for (const item of node.itemListElement) {
      collectProducts(item.item ?? item, out);
    }
  }
  if (Array.isArray(node["@graph"])) {
    for (const item of node["@graph"]) collectProducts(item, out);
  }
}

async function main() {
  await upsertShop();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: USER_AGENT });

  let listings = [];
  let diagnostics = {};

  try {
    await page.goto(START_URL, { waitUntil: "networkidle", timeout: 30_000 });

    const jsonLdBlocks = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.map((el) => el.textContent ?? ""),
    );
    const products = extractProductsFromJsonLd(jsonLdBlocks);

    diagnostics = {
      pageTitle: await page.title(),
      jsonLdBlockCount: jsonLdBlocks.length,
      productsFound: products.length,
    };

    listings = products
      .map((p) => {
        const url = typeof p.url === "string" ? p.url : typeof p["@id"] === "string" ? p["@id"] : null;
        if (!url || !p.name) return null;
        const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        return {
          externalId: url,
          title: p.name,
          url: url.startsWith("http") ? url : new URL(url, START_URL).toString(),
          imageUrl: typeof p.image === "string" ? p.image : Array.isArray(p.image) ? p.image[0] : null,
          priceCents: offer ? priceToCents(offer.price) : null,
          currency: offer?.priceCurrency ?? "USD",
          status: classifyAvailability(offer?.availability, `${p.name} ${p.description ?? ""}`),
        };
      })
      .filter(Boolean);
  } finally {
    await browser.close();
  }

  console.log(`[fanatics] diagnostics: ${JSON.stringify(diagnostics)}`);

  if (listings.length === 0) {
    console.warn(
      "[fanatics] No structured product data found on the page — nothing written. " +
        "This means the site either has no JSON-LD on this URL, uses a different " +
        "schema shape, or needs a different START_URL. Check diagnostics above and " +
        "adjust workers/fanatics/scrape.mjs.",
    );
    await upsertShop({ lastScrapeError: "No JSON-LD product data found — extraction needs rework." });
    await pool.end();
    process.exit(0);
  }

  const now = new Date();
  for (const item of listings) {
    const id = `${SHOP_ID}:${item.externalId}`;
    await pool.query(
      `insert into listings
         (id, shop_id, external_id, title, subject_name, url, image_url, price_cents, currency, status, tags, event_date, first_seen_at, last_seen_at, is_active)
       values ($1, $2, $3, $4, null, $5, $6, $7, $8, $9, '', null, $10, $10, true)
       on conflict (shop_id, external_id) do update set
         title = excluded.title,
         url = excluded.url,
         image_url = excluded.image_url,
         price_cents = excluded.price_cents,
         currency = excluded.currency,
         status = excluded.status,
         last_seen_at = excluded.last_seen_at,
         is_active = true`,
      [
        id,
        SHOP_ID,
        item.externalId,
        item.title,
        item.url,
        item.imageUrl,
        item.priceCents,
        item.currency,
        item.status,
        now,
      ],
    );
  }

  const seenIds = listings.map((l) => l.externalId);
  await pool.query(
    `update listings set is_active = false where shop_id = $1 and not (external_id = any($2::text[]))`,
    [SHOP_ID, seenIds],
  );

  await upsertShop();
  console.log(`[fanatics] wrote ${listings.length} listings`);
  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("[fanatics] FAILED:", err);
  try {
    await upsertShop({ lastScrapeError: String(err?.message ?? err) });
  } catch {
    // best effort
  }
  await pool.end();
  process.exit(1);
});

// Belt-and-suspenders: main() explicitly exits on every path above, but if
// something (a Playwright or pg handle) ever keeps the event loop alive
// despite that, this forces the process down after a generous grace period
// instead of running — and billing — indefinitely. This is what actually
// happened before this fix: no explicit exit call anywhere, so a lingering
// handle from Playwright/pg kept the process running for hours after the
// script had logically finished.
setTimeout(() => {
  console.error("[fanatics] watchdog: forcing exit after hanging past the grace period");
  process.exit(1);
}, 120_000).unref?.();
