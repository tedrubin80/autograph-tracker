export function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return "Price N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short" }).format(date);
}

export const STATUS_LABELS: Record<string, string> = {
  PRE_ORDER: "Pre-Order",
  SIGNING_EVENT: "Signing Event",
  IN_STOCK: "In Stock",
  SOLD_OUT: "Sold Out",
  UNKNOWN: "Unknown",
};

export const STATUS_STYLES: Record<string, string> = {
  PRE_ORDER: "bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-300",
  SIGNING_EVENT: "bg-violet-100 text-violet-900 dark:bg-violet-400/10 dark:text-violet-300",
  IN_STOCK: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300",
  SOLD_OUT: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  UNKNOWN: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};
