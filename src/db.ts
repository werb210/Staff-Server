import { createHash } from "crypto";
import pg, {
  type Pool as PgPool,
  type PoolClient,
  type PoolConfig,
  type QueryConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import { getDbPoolConnectionTimeoutMs } from "./config";
import { trackDependency } from "./observability/appInsights";
import { logError, logInfo, logWarn } from "./observability/logger";
import { setDbConnected } from "./startupState";

const { Pool } = pg;

type DbTestFailureMode = "connection_reset" | "connection_timeout";

type DbTestFailureInjection = {
  mode: DbTestFailureMode;
  remaining: number;
  matchQuery?: string;
};

type DbTestPoolMetricsOverride = {
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
  max?: number;
};

let dbTestFailureInjection: DbTestFailureInjection | null = null;
let dbTestPoolMetricsOverride: DbTestPoolMetricsOverride | null = null;

function isTestMode(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.DB_POOL_TEST_MODE === "true" ||
    process.env.DATABASE_URL === "pg-mem"
  );
}

function buildPoolConfig(): PoolConfig {
  const config: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  };
  if (process.env.DB_POOL_TEST_MODE === "true") {
    config.max = 2;
    config.idleTimeoutMillis = 1000;
    config.connectionTimeoutMillis = getDbPoolConnectionTimeoutMs();
  }
  return config;
}

export const isPgMem =
  process.env.DATABASE_URL === "pg-mem" ||
  (process.env.NODE_ENV === "test" && !process.env.DATABASE_URL);

const poolConfig = buildPoolConfig();

function createPgMemPool(config: PoolConfig): PgPool {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DataType, newDb } = require("pg-mem") as typeof import("pg-mem");
  const db = newDb({ noAstCoverageCheck: true, autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: "md5",
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value: string) =>
      createHash("md5").update(value ?? "").digest("hex"),
  });
  const adapter = db.adapters.createPg();
  const { connectionString, ...rest } = config;
  return new adapter.Pool(rest);
}

export const pool: PgPool =
  isPgMem
    ? createPgMemPool(poolConfig)
    : new Pool(poolConfig);

export function getPoolConfig(): PoolConfig {
  return { ...poolConfig };
}

export function setDbTestFailureInjection(injection: DbTestFailureInjection): void {
  dbTestFailureInjection = {
    ...injection,
    matchQuery: injection.matchQuery?.toLowerCase(),
  };
}

export function clearDbTestFailureInjection(): void {
  dbTestFailureInjection = null;
}

export function setDbTestPoolMetricsOverride(
  override: DbTestPoolMetricsOverride | null
): void {
  dbTestPoolMetricsOverride = override;
}

function extractQueryText(args: unknown[]): string | null {
  if (!args.length) {
    return null;
  }
  const first = args[0] as string | QueryConfig | undefined;
  if (typeof first === "string") {
    return first;
  }
  if (first && typeof (first as { text?: unknown }).text === "string") {
    return (first as { text: string }).text;
  }
  return null;
}

function makeTestError(mode: DbTestFailureMode): Error {
  const err =
    mode === "connection_timeout"
      ? new Error("connection timeout")
      : new Error("connection reset");
  (err as { code?: string }).code =
    mode === "connection_timeout" ? "ETIMEDOUT" : "ECONNRESET";
  return err;
}

function makePoolExhaustedError(): Error {
  const err = new Error("db_pool_exhausted");
  (err as { code?: string }).code = "53300";
  return err;
}

function getPoolMetrics(): Required<DbTestPoolMetricsOverride> {
  const poolState = pool as unknown as {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
    options?: { max?: number };
  };
  const max = dbTestPoolMetricsOverride?.max ?? poolState.options?.max ?? 10;
  return {
    totalCount: dbTestPoolMetricsOverride?.totalCount ?? poolState.totalCount ?? 0,
    idleCount: dbTestPoolMetricsOverride?.idleCount ?? poolState.idleCount ?? 0,
    waitingCount: dbTestPoolMetricsOverride?.waitingCount ?? poolState.waitingCount ?? 0,
    max,
  };
}

function shouldFailForPoolExhaustion(): boolean {
  if (!isTestMode()) {
    return false;
  }
  if (process.env.DB_TEST_FORCE_POOL_EXHAUSTION === "true") {
    return true;
  }
  const metrics = getPoolMetrics();
  return metrics.waitingCount > 0 && metrics.totalCount >= metrics.max;
}

export function assertPoolHealthy(): void {
  if (shouldFailForPoolExhaustion()) {
    throw new Error("db_pool_exhausted");
  }
}

function getSlowQueryDelayMs(queryText: string | null): number {
  if (!isTestMode()) {
    return 0;
  }
  const pattern = process.env.DB_TEST_SLOW_QUERY_PATTERN;
  const delayMs = Number(process.env.DB_TEST_SLOW_QUERY_MS ?? "0");
  if (!pattern || delayMs <= 0) {
    return 0;
  }
  if (!queryText) {
    return 0;
  }
  return queryText.toLowerCase().includes(pattern.toLowerCase()) ? delayMs : 0;
}

function getQueryTimeoutMs(): number {
  if (!isTestMode()) {
    return 0;
  }
  const timeoutMs = Number(process.env.DB_TEST_QUERY_TIMEOUT_MS ?? "0");
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0;
}

function applyTestFailureInjection(queryText: string | null): void {
  if (!isTestMode() || !dbTestFailureInjection) {
    return;
  }
  if (dbTestFailureInjection.remaining <= 0) {
    dbTestFailureInjection = null;
    return;
  }
  const matchQuery = dbTestFailureInjection.matchQuery;
  if (matchQuery && (!queryText || !queryText.toLowerCase().includes(matchQuery))) {
    return;
  }
  const mode = dbTestFailureInjection.mode;
  dbTestFailureInjection.remaining -= 1;
  if (dbTestFailureInjection.remaining <= 0) {
    dbTestFailureInjection = null;
  }
  throw makeTestError(mode);
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function createQueryWrapper<
  T extends (...args: unknown[]) => Promise<unknown>
>(originalQuery: T): T {
  const wrapped = (async (...args: unknown[]): Promise<unknown> => {
    const queryText = extractQueryText(args);
    const start = Date.now();
    try {
      if (shouldFailForPoolExhaustion()) {
        throw makePoolExhaustedError();
      }
      applyTestFailureInjection(queryText);
      const slowDelayMs = getSlowQueryDelayMs(queryText);
      if (slowDelayMs > 0) {
        const timeoutMs = getQueryTimeoutMs();
        if (timeoutMs > 0 && slowDelayMs >= timeoutMs) {
          await delay(timeoutMs);
          throw makeTestError("connection_timeout");
        }
        await delay(slowDelayMs);
      }
      const result = await originalQuery(...args);
      trackDependency({
        name: "postgres",
        data: queryText ?? "unknown",
        duration: Date.now() - start,
        success: true,
        dependencyTypeName: "postgres",
      });
      return result;
    } catch (err) {
      trackDependency({
        name: "postgres",
        data: queryText ?? "unknown",
        duration: Date.now() - start,
        success: false,
        dependencyTypeName: "postgres",
      });
      throw err;
    }
  }) as T;
  return wrapped;
}

function wrapClientQuery(client: PoolClient): void {
  const clientWithFlag = client as PoolClient & { __dbWrapped?: boolean };
  if (clientWithFlag.__dbWrapped) {
    return;
  }
  clientWithFlag.__dbWrapped = true;
  clientWithFlag.query = createQueryWrapper(clientWithFlag.query.bind(clientWithFlag));
}

const originalPoolQuery = pool.query.bind(pool);
pool.query = createQueryWrapper(originalPoolQuery) as typeof pool.query;

const originalConnect = pool.connect.bind(pool) as {
  (): Promise<PoolClient>;
  (
    callback: (
      err: Error | undefined,
      client: PoolClient | undefined,
      done: (release?: any) => void
    ) => void
  ): void;
};

pool.connect = ((callback?: (
  err: Error | undefined,
  client: PoolClient | undefined,
  done: (release?: any) => void
) => void) => {
  if (shouldFailForPoolExhaustion()) {
    const error = makePoolExhaustedError();
    if (callback) {
      callback(error, undefined, () => {});
      return;
    }
    return Promise.reject(error);
  }
  if (callback) {
    return originalConnect((err, client, done) => {
      if (client) {
        wrapClientQuery(client);
      }
      callback(err, client, done);
    });
  }
  return originalConnect().then((client) => {
    wrapClientQuery(client);
    return client;
  });
}) as typeof pool.connect;

function handleDbError(scope: string, err: unknown): void {
  const error = err instanceof Error ? err : new Error(String(err));
  setDbConnected(false);
  logWarn("db_connection_error", {
    scope,
    message: error.message,
    code: (error as { code?: string }).code,
  });
}

pool.on("connect", (client) => {
  setDbConnected(true);
  logInfo("db_client_connected");
  client.on("error", (err) => {
    handleDbError("client", err);
  });
});

pool.on("error", (err) => {
  handleDbError("pool", err);
  // IMPORTANT: do not crash process
});

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    logError("db_query_error", {
      message: err instanceof Error ? err.message : "unknown_error",
      code: err?.code,
    });
    throw err;
  }
}

export async function checkDb(): Promise<void> {
  await pool.query("select 1");
}

export async function warmUpDatabase(): Promise<void> {
  await pool.query("select 1");
}
