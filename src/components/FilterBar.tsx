import Link from "next/link";
import { LISTING_STATUSES } from "@/db/schema";
import { STATUS_LABELS } from "@/lib/format";

type Shop = { id: string; name: string };

export function FilterBar({
  shops,
  currentStatus,
  currentShop,
  currentQuery,
}: {
  shops: Shop[];
  currentStatus?: string;
  currentShop?: string;
  currentQuery?: string;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3" action="/" method="get">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Search</span>
        <input
          type="text"
          name="q"
          defaultValue={currentQuery ?? ""}
          placeholder="Celebrity or title"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Status</span>
        <select
          name="status"
          defaultValue={currentStatus ?? ""}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Shop</span>
        <select
          name="shop"
          defaultValue={currentShop ?? ""}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">All shops</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Apply
      </button>
      {(currentStatus || currentShop || currentQuery) && (
        <Link href="/" className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300">
          Clear
        </Link>
      )}
    </form>
  );
}
