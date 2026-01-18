import { runMigrations } from "../migrations";

export async function migrateDatabase(options?: { allowTest?: boolean }): Promise<void> {
  const isTest = process.env.NODE_ENV === "test";
  if (isTest) {
    return;
  }
  await runMigrations(options);
}
