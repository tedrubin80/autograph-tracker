import "dotenv/config";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "./client";

migrate(db, { migrationsFolder: "./drizzle" }).then(() => {
  console.log("Migrations applied.");
});
