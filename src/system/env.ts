import { getEnv } from "../config/env";

export function validateEnv() {
  const { PORT } = getEnv();
  if (!PORT) throw new Error("MISSING_PORT");

  if (process.env.NODE_ENV !== 'test' && !process.env.DB_URL) {
    throw new Error('MISSING_DB_URL');
  }
}
