import { runMigrations as runCoreMigrations } from "../migrations";

export async function runMigrations(): Promise<void> {
  await runCoreMigrations();
}
