import type { ListingStatus } from "@/db/schema";

const PRE_ORDER_HINTS = ["pre-order", "preorder", "pre order"];
const SIGNING_HINTS = ["signing", "send-in", "send in", "mail-in", "mail in", "private signing"];
const SOLD_OUT_HINTS = ["sold out", "sold-out"];

/**
 * Best-effort status classification from title/tags plus the shop's own
 * "available" flag (when it has one, e.g. Shopify). Shops label things
 * inconsistently, so this errs toward PRE_ORDER/SIGNING_EVENT over IN_STOCK
 * since that's what this tracker exists to surface.
 */
export function classifyStatus(input: {
  title: string;
  tags?: string[];
  available?: boolean | null;
}): ListingStatus {
  const haystack = [input.title, ...(input.tags ?? [])].join(" ").toLowerCase();

  if (SOLD_OUT_HINTS.some((h) => haystack.includes(h))) return "SOLD_OUT";
  if (input.available === false) return "SOLD_OUT";

  if (SIGNING_HINTS.some((h) => haystack.includes(h))) return "SIGNING_EVENT";
  if (PRE_ORDER_HINTS.some((h) => haystack.includes(h))) return "PRE_ORDER";

  if (input.available === true) return "IN_STOCK";
  return "UNKNOWN";
}

const STRIP_PATTERNS = [
  /\bofficial\b/gi,
  /\bautograph(ed)?\b/gi,
  /\bsigning\b/gi,
  /\bsigned\b/gi,
  /\bpre-?order\b/gi,
  /\bsend-?in\b/gi,
  /\bmail-?in\b/gi,
  /\bphoto\b/gi,
  /\bin[- ]person\b/gi,
];

/**
 * Best-effort extraction of a subject/celebrity name from a product title
 * like "Ozzy Osbourne Autograph Pre-Order" -> "Ozzy Osbourne". Falls back to
 * the trimmed original title when nothing looks strippable, so no data is
 * lost even when the heuristic misses.
 */
export function guessSubjectName(title: string): string | null {
  let out = title;
  // Cut at common separators that introduce qualifiers, e.g. "Name - 8x10 Photo".
  out = out.split(/[|]| - /)[0];
  for (const pattern of STRIP_PATTERNS) {
    out = out.replace(pattern, " ");
  }
  out = out.replace(/\s+/g, " ").trim();
  return out.length > 0 ? out : null;
}
