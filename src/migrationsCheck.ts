import { assertEnv } from "./config";
import { assertSchema, checkDb } from "./db";
import { assertNoPendingMigrations, runMigrations } from "./migrations";

async function main(): Promise<void> {
  assertEnv();
  await checkDb();
  await runMigrations();
  await assertNoPendingMigrations();
  await assertSchema();
}

if (require.main === module) {
  main().catch((err) => {
    console.error("migration_check_failed", err);
    process.exit(1);
  });
}
