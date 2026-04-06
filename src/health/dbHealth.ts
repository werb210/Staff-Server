import { dbQuery } from "../db";

export async function dbHealth() {
  let ok = false;
  try {
    await dbQuery("SELECT 1");
    ok = true;
  } catch {
    ok = false;
  }
  return { db: ok ? 'ok' : 'fail' };
}

export async function assertDatabaseHealthy(): Promise<void> {
  try {
    await dbQuery("SELECT 1");
  } catch {
    throw new Error('database_not_healthy');
  }
}
