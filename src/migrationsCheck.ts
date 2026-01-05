import { assertEnv } from "./config";
import { assertSchema, checkDb } from "./db";
import { assertNoPendingMigrations, runMigrations } from "./migrations";
import { logError } from "./observability/logger";

async function main(): Promise<void> {
  assertEnv();
  await checkDb();
  await runMigrations();
  await assertNoPendingMigrations();
  await assertSchema();
}

if (require.main === module) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : "unknown_error";
    logError("migration_check_failed", { error: message });
    process.exit(1);
  });
}
