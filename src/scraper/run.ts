import "dotenv/config";
import { shops } from "./shops";
import { runScrape } from "./run-once";

async function main() {
  console.log(`[scrape] running ${shops.filter((s) => s.enabled).length}/${shops.length} enabled shops`);
  const result = await runScrape(shops);
  for (const r of result.results) {
    if (r.error) console.error(`[scrape] ${r.shopId}: FAILED — ${r.error}`);
    else console.log(`[scrape] ${r.shopId}: ${r.listingCount} listings`);
  }
  console.log("[scrape] done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
