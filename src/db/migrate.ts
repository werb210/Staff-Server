import { runMigrations } from "../migrations";

export async function migrateDatabase(options?: { allowTest?: boolean }): Promise<void> {
  await runMigrations(options);
}
