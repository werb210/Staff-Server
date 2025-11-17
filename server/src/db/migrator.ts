import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.js";

(async () => {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations complete.");
  process.exit(0);
})();
