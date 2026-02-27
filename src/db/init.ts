import { runMigrations } from "../migrations";

export async function initDb(): Promise<void> {
  await runMigrations();
}
