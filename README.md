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
- **Database** (`src/db/`): Postgres (built for [Neon](https://neon.tech), via
  its serverless HTTP driver) through [Drizzle ORM](https://orm.drizzle.team/).
  Two tables — `shops` and `listings`.
- **Web app** (`src/app/`): a Next.js page that reads straight from the
  database, plus a small JSON API at `/api/listings`.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL — see below
npm run db:generate    # only needed after changing src/db/schema.ts
npm run db:migrate     # applies migrations to the DB in DATABASE_URL
npm run scrape          # populate it
npm run dev              # http://localhost:3000
```

`DATABASE_URL` needs a real Neon (or any Postgres) connection string —
nothing runs against an implicit local database. If this project is linked
to Vercel with Neon connected (`vercel link`, once), pull the same value
Vercel uses instead of copying it by hand:

```bash
vercel env pull .env
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

Nothing runs on a schedule by default. Since the database is Neon (reachable
from anywhere, not tied to one host's filesystem), the simplest option on
Vercel is **GitHub Actions hitting the deployed app**:
`.github/workflows/scrape.yml` POSTs to `/api/scrape` on a schedule. Set repo
secrets `APP_URL` (e.g. `https://autograph-tracker.vercel.app`) and
`SCRAPE_SECRET` (same value as the `SCRAPE_SECRET` env var on the Vercel
project) to enable it.

A scrape across several shops can run longer than a typical serverless
function timeout — see the note in `src/app/api/scrape/route.ts`. If that
becomes a problem (more shops, slower sites), run `npm run scrape` from a
GitHub Actions job directly instead (it just needs `DATABASE_URL` as a
secret) rather than round-tripping through the deployed app.

## Deploying

Set on the Vercel project (already the case once Neon is connected via
Vercel's integration, which sets `DATABASE_URL` automatically):

- `DATABASE_URL` — the Neon connection string.
- `SCRAPE_SECRET` — only if using the `/api/scrape` HTTP trigger above.

Then push to the branch Vercel is watching; migrations aren't run
automatically on deploy, so after schema changes run `npm run db:migrate`
locally (or in CI) with `DATABASE_URL` pointed at the same Neon database.

## A note on scraping etiquette

The scraper identifies itself with a distinct User-Agent (see
`src/scraper/http.ts`), only reads public catalog data intended for the
shop's own storefront, and paginates with short delays between requests
rather than firing everything at once. Before running this against a shop
at any real frequency, it's worth checking that shop's terms of service —
this is meant to save you a few browser tabs, not to hammer anyone's site.
