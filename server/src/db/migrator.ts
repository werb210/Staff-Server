import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./registry.js";

async function main() {
  console.log("Running migrations…");

  await migrate(db, {
    migrationsFolder: "migrations",
  });

  console.log("Migrations complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
