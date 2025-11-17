// server/src/db/migrator.ts
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.js";

async function run() {
  try {
    console.log("Running migrations…");
    await migrate(db, { migrationsFolder: "./server/drizzle" });
    console.log("Migrations complete.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
