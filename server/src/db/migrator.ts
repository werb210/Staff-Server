// server/src/db/migrator.ts

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./registry.js";

async function runMigrations() {
  console.log("🚀 Running Drizzle migrations...");

  try {
    await migrate(db, {
      migrationsFolder: new URL("./migrations", import.meta.url),
    });

    console.log("✅ Migrations completed successfully");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
