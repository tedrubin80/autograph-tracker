import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Deliberately not thrown eagerly: this module is imported at build time
// (Next.js evaluates route/page modules while collecting page data), where
// DATABASE_URL may not be injected yet. A placeholder here lets the build
// succeed; a real query against it fails loudly at request time instead,
// which is what we want if the env var is ever genuinely missing at runtime.
const connectionString = process.env.DATABASE_URL || "postgresql://user:pass@unset.invalid/unset";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
