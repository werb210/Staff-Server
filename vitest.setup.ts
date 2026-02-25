import { runMigrations } from "./src/migrations";

let initialized: Promise<void> | null = null;

export default async function setup() {
  if (!initialized) {
    initialized = runMigrations({
      ignoreMissingRelations: true,
      skipPlpgsql: true,
      rewriteAlterIfExists: true,
      rewriteCreateTableIfNotExists: true,
      skipPgMemErrors: true,
    });
  }

  await initialized;
}
