import { randomUUID, createHash } from "crypto";
import pg, {
  type Pool as PgPool,
  type PoolClient,
  type QueryConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import { trackDependency } from "./observability/appInsights";
import { getRequestContext } from "./observability/requestContext";
import { logError, logInfo, logWarn } from "./observability/logger";
import { markNotReady } from "./startupState";

type MemoryDb = {
  adapters: { createPg: () => { Pool: new (config?: any) => PgPool } };
  public: {
    registerFunction: (arg: any) => void;
    none: (sql: string) => void;
  };
};

type TestDbContext = {
  memoryDb: MemoryDb;
  adapter: { Pool: new (config?: any) => PgPool };
  pool: PgPool;
};

function createMemoryDb(): MemoryDb {
  const { newDb, DataType } = require("pg-mem") as typeof import("pg-mem");
  const memoryDb = newDb({
    autoCreateForeignKeyIndices: true,
    noAstCoverageCheck: true,
  });

  memoryDb.public.registerFunction({
    name: "md5",
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value: string) => createHash("md5").update(value).digest("hex"),
  });

  memoryDb.public.registerFunction({
    name: "regexp_replace",
    args: [DataType.text, DataType.text, DataType.text, DataType.text],
    returns: DataType.text,
    implementation: (
      value: string,
      pattern: string,
      replacement: string,
      flags: string
    ) => {
      if (value === null || value === undefined) {
        return null;
      }
      return value.replace(new RegExp(pattern, flags), replacement);
    },
  });

  memoryDb.public.registerFunction({
    name: "gen_random_uuid",
    args: [],
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });

  return memoryDb as MemoryDb;
}

function createTestDbContext(): TestDbContext {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("createTestDb is only available in NODE_ENV=test");
  }

  const memoryDb = createMemoryDb();
  const adapter = memoryDb.adapters.createPg();
  const PoolImpl = adapter.Pool as new (config?: any) => PgPool;
  const context: TestDbContext = {
    memoryDb,
    adapter,
    pool: new PoolImpl({}),
  };

  bindPoolInstrumentation(context.pool);
  return context;
}

export function createTestDb(): TestDbContext {
  return createTestDbContext();
}

let activeContext: TestDbContext | null =
  process.env.NODE_ENV === "test" ? createTestDbContext() : null;

export async function initializeTestDb(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("initializeTestDb is only available in NODE_ENV=test");
  }

  const previousPool = activeContext?.pool ?? null;
  activeContext = createTestDbContext();
  pool = activeContext.pool;
  db = pool;

  if (previousPool) {
    await previousPool.end();
  }
}

export function setupTestDatabase() {
  if (!activeContext) {
    throw new Error("setupTestDatabase is only available in NODE_ENV=test");
  }
  return activeContext.adapter;
}

export function getTestDb() {
  if (!activeContext) {
    throw new Error("getTestDb is only available in NODE_ENV=test");
  }
  return activeContext.memoryDb;
}

export let pool: PgPool = activeContext?.pool ?? new pg.Pool({});
export let db = pool;

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

function bindPoolInstrumentation(targetPool: PgPool): void {
  const originalPoolQuery = targetPool.query.bind(targetPool);
  targetPool.query = createQueryWrapper<typeof originalPoolQuery>(originalPoolQuery);

  targetPool.on("connect", () => logInfo("db_client_connected"));
  targetPool.on("error", (err) => {
    markNotReady("db_unavailable");
    logWarn("db_connection_error", { message: err.message });
  });
}


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
  await pool.query("select 1");
  assertPoolHealthy();
}

export async function getInstrumentedClient(): Promise<PoolClient> {
  const client = await pool.connect();
  (client as any).query = createQueryWrapper((client as any).query.bind(client));
  return client;
}
