import { formatPrice, formatRelativeDate, STATUS_LABELS, STATUS_STYLES } from "@/lib/format";

type Listing = {
  id: string;
  title: string;
  subjectName: string | null;
  url: string;
  imageUrl: string | null;
  priceCents: number | null;
  currency: string;
  status: string;
  firstSeenAt: Date;
  shopName: string;
};

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
    >
      <div className="aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable source domains
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[listing.status] ?? STATUS_STYLES.UNKNOWN}`}
        >
          {STATUS_LABELS[listing.status] ?? listing.status}
        </span>
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {listing.subjectName || listing.title}
        </h3>
        <div className="mt-auto flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="truncate">{listing.shopName}</span>
          <span>{formatRelativeDate(listing.firstSeenAt)}</span>
        </div>
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {formatPrice(listing.priceCents, listing.currency)}
        </div>
      </div>
    </a>
  );
}
