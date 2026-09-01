import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `generate` only reads schema.ts and doesn't touch a real database, so a
// placeholder keeps it usable without DATABASE_URL set. `push`/`studio`
// (which do connect) will fail with a clear error against the placeholder
// rather than silently doing nothing.
const connectionString = process.env.DATABASE_URL ?? "postgresql://placeholder/placeholder";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
