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

const { Pool } = pg;

function buildPoolConfig(): PoolConfig {
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX ?? 20),
  };
}

export const pool: PgPool = new Pool(buildPoolConfig());
export const db = pool;

export function query(text: string, params?: any[]): Promise<QueryResult> {
  return pool.query(text, params);
}

export function getClient() {
  return pool;
}

function extractQueryText(args: unknown[]): string | null {
  const first = args[0] as string | QueryConfig | undefined;
  if (typeof first === "string") return first;
  if (first && typeof (first as any).text === "string") return (first as any).text;
  return null;
}

function extractQueryParams(args: unknown[]): unknown[] | null {
  const first = args[0] as string | QueryConfig | undefined;
  if (first && typeof first === "object" && Array.isArray((first as any).values)) {
    return (first as any).values as unknown[];
  }
  const second = args[1] as unknown;
  if (Array.isArray(second)) return second;
  return null;
}

type PoolMetrics = {
  waitingCount: number;
  totalCount: number;
  max: number;
};

let testPoolMetricsOverride: PoolMetrics | null = null;

export function setDbTestPoolMetricsOverride(override: PoolMetrics | null): void {
  testPoolMetricsOverride = override;
}

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

const originalPoolQuery = pool.query.bind(pool);
pool.query = createQueryWrapper<typeof originalPoolQuery>(originalPoolQuery);

pool.on("connect", () => logInfo("db_client_connected"));
pool.on("error", (err) => {
  markNotReady("db_unavailable");
  logWarn("db_connection_error", { message: err.message });
});

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

export async function checkDb(): Promise<void> {
  await pool.query("select 1");
}

export async function warmUpDatabase(): Promise<void> {
  try {
    await pool.query("select 1");
  } catch {
    throw new Error("db unavailable");
  }
}

export async function getInstrumentedClient(): Promise<PoolClient> {
  const client = await pool.connect();
  (client as any).query = createQueryWrapper((client as any).query.bind(client));
  return client;
}

let shutdownInProgress = false;

async function shutdownPool(signal: string): Promise<void> {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  try {
    logInfo("db_pool_shutdown_started", { signal });
    await pool.end();
    logInfo("db_pool_shutdown_completed", { signal });
  } catch (err) {
    logError("db_pool_shutdown_failed", {
      signal,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

process.on("SIGTERM", () => {
  void shutdownPool("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdownPool("SIGINT");
});
