import { getEnv } from "../config/env";

export function validateEnv() {
  const { PORT, NODE_ENV } = getEnv();
  if (NODE_ENV !== "test" && !process.env.DB_URL) {
    throw new Error("MISSING_DB_URL");
  }
}
