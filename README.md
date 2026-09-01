# Autograph Tracker

Tracks the latest autograph pre-orders and signing announcements across a
handful of consignment shops, and shows them on one page you can search and
filter — instead of checking five different shop sites by hand.

## How it works

- **Scraper** (`src/scraper/`): one adapter per shop, pulling from the most
  stable source each platform offers — Shopify's public `/products.json`
  catalog endpoint for Shopify stores, HTML parsing for WooCommerce stores.
  A run upserts everything into the database and marks listings no longer
  found as inactive (sold through / removed).
- **Database** (`src/db/`): SQLite via [Drizzle ORM](https://orm.drizzle.team/).
  Two tables — `shops` and `listings`.
- **Web app** (`src/app/`): a Next.js page that reads straight from the
  database, plus a small JSON API at `/api/listings`.

## Quick start

```bash
npm install
cp .env.example .env
npm run db:generate   # only needed after changing src/db/schema.ts
npm run db:migrate    # creates ./data/autograph-tracker.db
npm run scrape         # populate it
npm run dev             # http://localhost:3000
```

## Tracked shops

| Shop | Platform | Status |
| --- | --- | --- |
| [Zobie Productions](https://shopzobie.com) | Shopify | ✅ enabled |
| [Dark Parlor Originals](https://www.darkparlororiginals.com) | Shopify | ✅ enabled |
| [SWAU](https://swau.com) | Shopify (scoped to their signings collection) | ✅ enabled |
| [Mintych Authentics](https://www.mintychauthentics.com) | Shopify | ✅ enabled |
| [CSR Collectibles](https://csrcollectibles.com) | WooCommerce | ✅ enabled |
| Fanatics Authentic, Steiner Sports, Upper Deck Authenticated, MAB, GottaHaveIt/RR Auction | custom | ⛔ placeholder only |

Full config, including notes on a couple of best-guess name matches and why
the "big general dealer" shops are disabled, lives in `src/scraper/shops.ts`.

**A note on verification:** the Shopify/WooCommerce adapters were written
against each platform's documented default behavior, not confirmed against
live responses from every shop above — this development environment's
network egress doesn't reach those domains. Run `npm run scrape` and check
the output (and the "Tracked shops" panel at the bottom of the homepage,
which surfaces per-shop errors) before trusting the data; tune selectors in
`src/scraper/adapters/woocommerce.ts` if CSR's markup doesn't match.

## Adding a shop

1. Figure out the platform. Visit the shop; if product URLs look like
   `/products/<handle>` and collections look like `/collections/<handle>`,
   it's almost certainly Shopify — try `<domain>/products.json` in a
   browser to confirm the catalog endpoint is open.
2. **Shopify:** add an entry to `src/scraper/shops.ts` using
   `createShopifyAdapter({ baseUrl })`. Optionally pass `collectionHandle`
   to scope to one collection instead of the whole catalog.
3. **WooCommerce** (`/product-category/...` URLs, "Add to basket" buttons):
   use `createWooCommerceAdapter({ baseUrl, listingPath })`. Run it once,
   inspect the listings it returns, and adjust `selectors` if the theme
   doesn't match WooCommerce's stock class names.
4. **Anything else:** write a new file under `src/scraper/adapters/` that
   returns `RawListing[]` (see `src/scraper/types.ts`), and wire it in the
   same way.
5. Set `enabled: true` once you've confirmed it returns real data.

## Scheduling scrapes

Nothing runs on a schedule by default — pick whichever fits how you deploy:

- **A host you control** (a VPS, Railway, Fly): a plain cron job or
  Railway's Cron Jobs feature running `npm run scrape` is simplest, since it
  shares the filesystem with the SQLite database.
- **GitHub Actions, hitting a deployed app:** `.github/workflows/scrape.yml`
  POSTs to `/api/scrape` on a schedule. Set repo secrets `APP_URL` and
  `SCRAPE_SECRET` (same value as the `SCRAPE_SECRET` env var on your
  deployment) to use it. Only works if your deployment's function timeout
  is long enough to finish a full scrape — see the note in
  `src/app/api/scrape/route.ts`.

## Deploying

This defaults to SQLite on local disk, which needs a **persistent
filesystem shared between the web process and the scrape process** —
Railway, Fly.io, or a plain VPS/Docker container all work well.

**Vercel (or any serverless host) won't work as-is**: serverless functions
get an ephemeral, per-invocation filesystem, so a SQLite file written by one
request is gone by the next. To deploy there, swap the driver in
`src/db/client.ts` for a hosted Postgres (`drizzle-orm/node-postgres` or
similar) — the schema in `src/db/schema.ts` was written to be portable
(no SQLite-only column types) specifically so that swap stays small.

## A note on scraping etiquette

The scraper identifies itself with a distinct User-Agent (see
`src/scraper/http.ts`), only reads public catalog data intended for the
shop's own storefront, and paginates with short delays between requests
rather than firing everything at once. Before running this against a shop
at any real frequency, it's worth checking that shop's terms of service —
this is meant to save you a few browser tabs, not to hammer anyone's site.
