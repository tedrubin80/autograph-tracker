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
| [Celebrity Authentics](https://celebrityauthentics.com) | Shopify | ✅ enabled |
| [CSR Collectibles](https://csrcollectibles.com) | WooCommerce | ✅ enabled |
| [Twin Cities Comics](https://twincitiescomics.com) | WooCommerce (private signings category) | ✅ enabled |
| [Upper Deck Authenticated](https://upperdeckstore.com) | Magento (best guess — see note below) | ✅ enabled, unverified |
| [Fanatics Authentic](https://www.fanaticsauthentic.com) | custom, JS-rendered — Playwright worker in `workers/fanatics/` | ⛔ not deployed, see note below |
| Steiner Sports, MAB | custom | ⛔ placeholder only |

Full config, including notes on a couple of best-guess name matches and why
the remaining shops are disabled, lives in `src/scraper/shops.ts`.

**A note on verification:** the Shopify/WooCommerce/Magento adapters were
written against each platform's documented default behavior, not confirmed
against live responses from every shop above — this development
environment's network egress doesn't reach those domains. Run `npm run
scrape` and check the output (and the "Tracked shops" panel at the bottom of
the homepage, which surfaces per-shop errors) before trusting the data; tune
selectors in `src/scraper/adapters/woocommerce.ts` or `magento.ts` if a
shop's markup doesn't match. Upper Deck in particular is a guess at both the
platform (Magento) and the listing path (`/memorabilia.html`) — check its
listing count and error field after the first real run.

**Fanatics Authentic is different from the rest**: its storefront is a fully
custom platform with no known public catalog structure, most likely rendered
client-side, so a plain HTTP fetch can't see its products. The code lives in
`workers/fanatics/` as an isolated Playwright-based worker — its own
`package.json`, its own Dockerfile (Microsoft's official Playwright image,
needed because Railway's default build/runtime split otherwise discards the
system libraries Chromium needs) — specifically so a browser-automation
dependency never touches the main app's `package.json` that Vercel builds.
It looks for schema.org JSON-LD product data (a common, standardized
pattern) rather than guessed CSS selectors, but came back empty on the one
real run so far — nothing was found at the guessed starting URL. **It's not
currently deployed** (removed from Railway); redeploy it once someone finds
where Fanatics actually publishes structured product data, or a better
starting point than the guess in `scrape.mjs`.

## Adding a shop

1. Figure out the platform. Visit the shop; if product URLs look like
   `/products/<handle>` and collections look like `/collections/<handle>`,
   it's almost certainly Shopify — try `<domain>/products.json` in a
   browser to confirm the catalog endpoint is open.
2. **Shopify:** add an entry to `src/scraper/shops.ts` using
   `createShopifyAdapter({ baseUrl })`. Optionally pass `collectionHandle`
   to scope to one collection instead of the whole catalog.
3. **WooCommerce** (`/product-category/...` or `/product/<slug>/` URLs,
   "Add to basket" buttons): use `createWooCommerceAdapter({ baseUrl,
   listingPath })`. Run it once, inspect the listings it returns, and adjust
   `selectors` if the theme doesn't match WooCommerce's stock class names.
4. **Magento** (`.html`-suffixed category pages, an `mcprod.`-style
   subdomain in evidence): same idea, `createMagentoAdapter({ baseUrl,
   listingPath })` from `src/scraper/adapters/magento.ts`.
5. **A fetch-based platform not covered above:** write a new file under
   `src/scraper/adapters/` that returns `RawListing[]` (see
   `src/scraper/types.ts`), and wire it into `shops.ts` the same way.
6. **A JS-rendered / heavily custom site** (product grid loads via
   client-side JS, no simple HTML or JSON to fetch): don't add it to
   `shops.ts` directly — that would pull a headless-browser dependency into
   the main app's `package.json`, which Vercel also builds. Instead give it
   its own subfolder under `workers/` with its own `package.json` and its
   own Railway service, following `workers/fanatics/` as the template.
7. Set `enabled: true` (or deploy the new worker) once you've confirmed it
   returns real data.

## Scheduling scrapes

**What's actually running:** a Railway project (`autograph-tracker-scraper`)
with a `scraper` service pointed at this repo, writing straight to the same
Neon database via `DATABASE_URL` — the main app's shops, via `npm run
scrape` on a `0 0 * * 3` cron (midnight UTC every Wednesday, restart policy
off since it's a one-shot job). Railway runs the start command once
immediately on deploy as well as on the schedule, so pushing a fix re-runs
it right away — you don't have to wait for the next Wednesday to see it.

`workers/fanatics/` (the isolated Playwright-based scraper for Fanatics
Authentic — see the note above) is not currently deployed; it was removed
from Railway pending a real look at the site to find a working data source.
The code stays in the repo; redeploying it means creating a new Railway
service pointed at that subfolder with its own `Dockerfile` build, same as
before.

`.github/workflows/scrape.yml` (POSTs to `/api/scrape` on a schedule) has
**no schedule trigger by default** — it's `workflow_dispatch`-only (manual).
It previously had a `schedule:` block without the `APP_URL`/`SCRAPE_SECRET`
repo secrets ever being set, so it failed instantly on every single
scheduled run (100% failure rate) the whole time it was enabled. Don't
re-add a schedule without setting both secrets first, and only do so if you
actually want this running instead of (or alongside) Railway. A scrape
across several shops can run longer than a typical serverless function
timeout, which is the main reason Railway (a real, always-available
process) ended up being the primary path — see the note in
`src/app/api/scrape/route.ts`.

## Deploying

Set on the Vercel project (already the case once Neon is connected via
Vercel's integration, which sets `DATABASE_URL` automatically):

- `DATABASE_URL` — the Neon connection string.
- `SCRAPE_SECRET` — only if using the `/api/scrape` HTTP trigger above.

Then push to the branch Vercel is watching. Vercel runs `vercel-build`
instead of `build` when present (`package.json`), which applies pending
migrations before `next build` — so a schema change just needs a push, no
manual migration step. Re-running migrations is safe (Drizzle tracks what's
already applied); if it ever fails, the deploy fails loudly rather than
shipping a build that queries tables that don't exist yet.

## A note on scraping etiquette

The scraper identifies itself with a distinct User-Agent (see
`src/scraper/http.ts`), only reads public catalog data intended for the
shop's own storefront, and paginates with short delays between requests
rather than firing everything at once. Before running this against a shop
at any real frequency, it's worth checking that shop's terms of service —
this is meant to save you a few browser tabs, not to hammer anyone's site.
