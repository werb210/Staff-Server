/**
 * Production vs test DB module resolver.
 * - test: in-memory pg-mem adapter
 * - otherwise: real Postgres pool
 */

import * as dbProd from "./db.prod";
import * as dbTest from "./dbTest";

const dbImpl = process.env.NODE_ENV === "test" ? dbTest : dbProd;

if (process.env.NODE_ENV === "test" && process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must not be set in test mode. Tests must use in-memory DB."
  );
}

export const {
  pool,
  db,
  query,
  getClient,
  dbQuery,
  assertPoolHealthy,
  checkDb,
  warmUpDatabase,
  getInstrumentedClient,
  setDbTestPoolMetricsOverride,
} = dbImpl;
