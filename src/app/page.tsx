import { getListings, getShopsWithCounts } from "@/db/queries";
import { LISTING_STATUSES, type ListingStatus } from "@/db/schema";
import { ListingCard } from "@/components/ListingCard";
import { FilterBar } from "@/components/FilterBar";

export const dynamic = "force-dynamic";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const statusParam = firstParam(searchParams.status);
  const status = LISTING_STATUSES.includes(statusParam as ListingStatus)
    ? (statusParam as ListingStatus)
    : undefined;
  const shopId = firstParam(searchParams.shop);
  const q = firstParam(searchParams.q);

  const [listings, shops] = await Promise.all([
    getListings({ status, shopId, q }),
    getShopsWithCounts(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Autograph Tracker</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Latest pre-orders and signing announcements, pulled from consignment shops.
        </p>
      </header>

      <FilterBar shops={shops} currentStatus={status} currentShop={shopId} currentQuery={q} />

      {listings.length === 0 ? (
        <EmptyState hasShops={shops.length > 0} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      <ShopStatusFooter shops={shops} />
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function EmptyState({ hasShops }: { hasShops: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      <p className="font-medium">No listings yet.</p>
      <p>
        {hasShops
          ? "Run a scrape to pull in the latest listings: "
          : "No shops configured yet. Once shops exist, run: "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">npm run scrape</code>
      </p>
    </div>
  );
}

function ShopStatusFooter({
  shops,
}: {
  shops: Awaited<ReturnType<typeof getShopsWithCounts>>;
}) {
  return (
    <details className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
      <summary className="cursor-pointer select-none">Tracked shops ({shops.length})</summary>
      <ul className="mt-2 flex flex-col gap-1">
        {shops.map((shop) => (
          <li key={shop.id} className="flex flex-wrap items-center gap-2">
            <span className={shop.enabled ? "" : "line-through opacity-60"}>{shop.name}</span>
            {!shop.enabled && <span>(not yet implemented)</span>}
            {shop.lastScrapedAt && <span>last scraped {shop.lastScrapedAt.toLocaleString()}</span>}
            {shop.lastScrapeError && (
              <span className="text-red-600 dark:text-red-400">error: {shop.lastScrapeError}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
