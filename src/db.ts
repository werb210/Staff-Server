// src/db.ts
import pg, {
  type Pool as PgPool,
  type PoolClient,
  type PoolConfig,
  type QueryConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import { trackDependency } from "./observability/appInsights";
import { getRequestContext } from "./observability/requestContext";
import { logError, logInfo, logWarn } from "./observability/logger";
import { markNotReady } from "./startupState";

/*
 * Database initialization and utilities for production and test environments.
 *
 * This module wraps pg.Pool and augments it with instrumentation for
 * Application Insights.
 */

const { Pool } = pg;

/**
 * Build the PoolConfig.
 */
function buildPoolConfig(): PoolConfig {
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  };
}

const isTestEnv = process.env.NODE_ENV === "test";
let poolConfig = buildPoolConfig();
let PoolImpl: typeof Pool = Pool;

if (isTestEnv) {
  const { newDb } = require("pg-mem") as typeof import("pg-mem");
  const memoryDb = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDb.adapters.createPg();
  PoolImpl = adapter.Pool as typeof Pool;
  poolConfig = {};
}

/**
 * Exported pool instance.
 */
export const pool: PgPool = new PoolImpl(poolConfig);

/**
 * Extract SQL text from arguments to pool.query() for instrumentation.
 */
function extractQueryText(args: unknown[]): string | null {
  const first = args[0] as string | QueryConfig | undefined;
  if (typeof first === "string") return first;
  if (first && typeof (first as any).text === "string") return (first as any).text;
  return null;
}

/**
 * Extract SQL parameters from arguments to pool.query() for instrumentation.
 */
function extractQueryParams(args: unknown[]): unknown[] | null {
  const first = args[0] as string | QueryConfig | undefined;
  if (first && typeof first === "object" && Array.isArray((first as any).values)) {
    return (first as any).values as unknown[];
  }
  const second = args[1] as unknown;
  if (Array.isArray(second)) return second;
  return null;
}

/**
 * Structure representing basic metrics for the PostgreSQL connection pool.
 */
type PoolMetrics = {
  waitingCount: number;
  totalCount: number;
  max: number;
};

let testPoolMetricsOverride: PoolMetrics | null = null;

export function setDbTestPoolMetricsOverride(override: PoolMetrics | null): void {
  testPoolMetricsOverride = override;
}

/**
 * Wrap a query function (from the pool or a client) to capture telemetry.
 */
function createQueryWrapper<T extends (...args: any[]) => Promise<any>>(originalQuery: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const queryText = extractQueryText(args as unknown[]);
    const requestContext = getRequestContext();
    const shouldTrace = requestContext?.sqlTraceEnabled ?? false;
    const traceStart = shouldTrace ? process.hrtime.bigint() : null;
    const traceStack = shouldTrace ? new Error("sql-trace").stack : undefined;
    const traceParams = shouldTrace ? extractQueryParams(args as unknown[]) : null;
    const start = Date.now();
    try {
      const result = await originalQuery(...(args as Parameters<T>));
      trackDependency({
        name: "postgres",
        data: queryText ?? "unknown",
        duration: Date.now() - start,
        success: true,
        dependencyTypeName: "postgres",
      });
      return result as ReturnType<T>;
    } catch (err) {
      trackDependency({
        name: "postgres",
        data: queryText ?? "unknown",
        duration: Date.now() - start,
        success: false,
        dependencyTypeName: "postgres",
      });
      throw err;
    } finally {
      if (shouldTrace && traceStart !== null) {
        const durationMs = Number(process.hrtime.bigint() - traceStart) / 1e6;
        logInfo("sql_trace_query", {
          requestId: requestContext?.requestId ?? "unknown",
          path: requestContext?.path ?? "unknown",
          sql: queryText ?? "unknown",
          params: traceParams,
          durationMs,
          stack: traceStack,
        });
      }
    }
  };
  return wrapped as unknown as T;
}

// Wrap pool.query() and client.query() so telemetry is recorded for all queries.
const originalPoolQuery = pool.query.bind(pool);
pool.query = createQueryWrapper<typeof originalPoolQuery>(originalPoolQuery);

// Log when clients connect and when errors occur on the pool.
pool.on("connect", () => logInfo("db_client_connected"));
pool.on("error", (err) => {
  markNotReady("db_unavailable");
  logWarn("db_connection_error", { message: err.message });
});

/**
 * Generic helper to execute a query and log errors. Use this instead of
 * pool.query() directly when you want error logging.
 */
export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    logError("db_query_error", { message: err.message, code: err.code });
    throw err;
  }
}

/**
 * Assert that the database pool is healthy.
 */
export function assertPoolHealthy(): void {
  const metrics: PoolMetrics = testPoolMetricsOverride ?? {
    waitingCount: (pool as any).waitingCount ?? 0,
    totalCount: (pool as any).totalCount ?? 0,
    max: (pool as any).options?.max ?? 0,
  };
  if (metrics.max > 0 && metrics.waitingCount > 0 && metrics.totalCount >= metrics.max) {
    throw new Error("db_pool_exhausted");
  }
}

/**
 * Perform a simple query to ensure connectivity to the database. This is used
 * by health checks and tests. If the query fails, the error will propagate.
 */
export async function checkDb(): Promise<void> {
  await pool.query("select 1");
}

/**
 * Warm up the database connection and then assert that the pool is healthy.
 * This should be called on application startup to fail fast if the DB is
 * unreachable or the pool is exhausted.
 */
export async function warmUpDatabase(): Promise<void> {
  await pool.query("select 1");
  assertPoolHealthy();
}

/**
 * Acquire a client from the pool and wrap its query method to record
 * telemetry. This helper should be used instead of calling pool.connect()
 * directly when you need an instrumented client. It returns a promise
 * resolving to a PoolClient. The client must be released via client.release().
 */
export async function getInstrumentedClient(): Promise<PoolClient> {
  const client = await pool.connect();
  (client as any).query = createQueryWrapper((client as any).query.bind(client));
  return client;
}
