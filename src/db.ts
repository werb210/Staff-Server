import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import {
  getDbPoolConnectionTimeoutMs,
  getDbPoolIdleTimeoutMs,
  getDbPoolMax,
  isTestEnvironment,
} from "./config";
import { logError, logInfo, logWarn } from "./observability/logger";
import { trackDependency, trackEvent } from "./observability/appInsights";
import { buildTelemetryProperties } from "./observability/telemetry";
import { addRequestDbProcessId, removeRequestDbProcessId } from "./middleware/requestContext";

export const isPgMem =
  process.env.NODE_ENV === "test" &&
  (!process.env.DATABASE_URL || process.env.DATABASE_URL === "pg-mem");

export function isPgMemRuntime(): boolean {
  return (
    process.env.NODE_ENV === "test" &&
    (!process.env.DATABASE_URL || process.env.DATABASE_URL === "pg-mem")
  );
}

const basePoolConfig: PoolConfig = {
  max: getDbPoolMax(),
  min: 0,
  idleTimeoutMillis: getDbPoolIdleTimeoutMs(),
  connectionTimeoutMillis: getDbPoolConnectionTimeoutMs(),
};

const testPoolOverrideEnabled =
  isTestEnvironment() && process.env.DB_POOL_TEST_MODE === "true";

const poolConfig: PoolConfig = testPoolOverrideEnabled
  ? {
      ...basePoolConfig,
      max: 2,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 1000,
    }
  : basePoolConfig;

if (testPoolOverrideEnabled) {
  logInfo("db_test_pool_override_enabled", {
    max: poolConfig.max,
    idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
  });
}

type DbMetadata = {
  host: string;
  port?: number;
  sslEnabled: boolean;
};

function maskHost(host: string): string {
  if (host.length <= 4) {
    return "*".repeat(host.length);
  }
  return `${host.slice(0, 2)}***${host.slice(-2)}`;
}

function resolveDbMetadata(): DbMetadata {
  const connectionString = process.env.DATABASE_URL;
  if (isPgMem) {
    return { host: "pg-mem", sslEnabled: false };
  }
  if (connectionString) {
    try {
      const url = new URL(connectionString);
      const port = url.port ? Number(url.port) : undefined;
      const hostname = url.hostname.toLowerCase();
      const sslEnabled =
        url.searchParams.get("sslmode") === "require" ||
        hostname.endsWith(".postgres.database.azure.com") ||
        hostname.endsWith(".postgres.database.usgovcloudapi.net");
      return {
        host: url.hostname,
        port,
        sslEnabled,
      };
    } catch {
      const hostname = (process.env.PGHOST ?? "unknown").toLowerCase();
      const sslEnabled =
        (process.env.PGSSLMODE ?? "").toLowerCase() === "require" ||
        hostname.endsWith(".postgres.database.azure.com") ||
        hostname.endsWith(".postgres.database.usgovcloudapi.net");
      return {
        host: process.env.PGHOST ?? "unknown",
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        sslEnabled,
      };
    }
  }
  const hostname = (process.env.PGHOST ?? "unknown").toLowerCase();
  const sslEnabled =
    (process.env.PGSSLMODE ?? "").toLowerCase() === "require" ||
    hostname.endsWith(".postgres.database.azure.com") ||
    hostname.endsWith(".postgres.database.usgovcloudapi.net");
  return {
    host: process.env.PGHOST ?? "unknown",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    sslEnabled,
  };
}

const dbMetadata = resolveDbMetadata();

function resolveSslConfig(): PoolConfig["ssl"] {
  if (isPgMem) {
    return undefined;
  }

  const connectionString = process.env.DATABASE_URL ?? "";
  const sslMode = process.env.PGSSLMODE ?? "";
  const hostname = dbMetadata.host.toLowerCase();
  const isAzure =
    hostname.endsWith(".postgres.database.azure.com") ||
    hostname.endsWith(".postgres.database.usgovcloudapi.net");
  const requiresSsl =
    sslMode.toLowerCase() === "require" ||
    connectionString.toLowerCase().includes("sslmode=require") ||
    isAzure;

  if (!requiresSsl) {
    return undefined;
  }

  return { rejectUnauthorized: false };
}

function createPool(): Pool {
  if (isPgMem) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { newDb } = require("pg-mem") as typeof import("pg-mem");
    const db = newDb({ autoCreateForeignKeyIndices: false });
    const adapter = db.adapters.createPg();
    return new adapter.Pool(poolConfig);
  }

  return new Pool({
    ...poolConfig,
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSslConfig(),
  });
}

export const pool = createPool();

export async function cancelDbWork(processIds: number[]): Promise<void> {
  if (processIds.length === 0) {
    return;
  }
  await Promise.all(
    processIds.map(async (processId) => {
      try {
        await pool.query("select pg_cancel_backend($1)", [processId]);
      } catch {
        // ignore cancel errors
      }
    })
  );
}

export function getPoolConfig(): PoolConfig {
  return { ...poolConfig };
}

type AuthQueryable = Pick<PoolClient, "query">;

const defaultAuthQueryTimeoutMs = Math.max(
  250,
  Number(process.env.AUTH_DB_QUERY_TIMEOUT_MS ?? 2500)
);

function getAuthQueryTimeoutMs(): number {
  return Math.max(
    250,
    Number(process.env.AUTH_DB_QUERY_TIMEOUT_MS ?? defaultAuthQueryTimeoutMs)
  );
}

function assertAuthPoolAvailability(): void {
  const { idleCount, totalCount, waitingCount, max } = getPoolMetrics();
  if (waitingCount > 0 && totalCount >= max) {
    const error = new Error("db_pool_exhausted");
    (error as { code?: string }).code = "53300";
    trackEvent({
      name: "db_pool_exhaustion_prevented",
      properties: buildTelemetryProperties({
        totalCount,
        waitingCount,
        max,
        reason: "waiting_clients",
      }),
    });
    throw error;
  }
  if (idleCount < 1 && totalCount >= max) {
    const error = new Error("db_pool_no_free_client");
    (error as { code?: string }).code = "53300";
    trackEvent({
      name: "db_pool_exhaustion_prevented",
      properties: buildTelemetryProperties({
        totalCount,
        idleCount,
        max,
        reason: "no_idle_clients",
      }),
    });
    throw error;
  }
}

function buildAuthQueryConfig(
  text: string,
  values?: unknown[]
): {
  text: string;
  values?: unknown[];
  query_timeout: number;
} {
  return {
    text,
    values,
    query_timeout: getAuthQueryTimeoutMs(),
  };
}

export async function runAuthQuery<T extends QueryResultRow = QueryResultRow>(
  runner: AuthQueryable,
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  assertAuthPoolAvailability();
  const queryConfig = buildAuthQueryConfig(text, values);
  return runner.query(
    queryConfig as unknown as Parameters<Pool["query"]>[0]
  ) as Promise<QueryResult<T>>;
}

const poolTarget = `${dbMetadata.host}${dbMetadata.port ? `:${dbMetadata.port}` : ""}`;

function getQueryText(args: unknown[]): string {
  const [first] = args;
  if (typeof first === "string") {
    return first;
  }
  if (first && typeof first === "object" && "text" in (first as Record<string, unknown>)) {
    const text = (first as { text?: string }).text;
    return text ?? "prepared_statement";
  }
  return "unknown_query";
}

function wrapQuery<T extends { query: Pool["query"] }>(
  runner: T
): void {
  const originalQuery = runner.query.bind(runner);
  runner.query = (async (...args: Parameters<Pool["query"]>) => {
    const queryText = getQueryText(args);
    const start = Date.now();
    const processId = (runner as { processID?: number }).processID;
    try {
      if (processId) {
        addRequestDbProcessId(processId);
      }
      const result = await runQueryWithTestControls(originalQuery, args, queryText);
      trackDependency({
        name: "postgres.query",
        target: poolTarget,
        data: queryText,
        duration: Date.now() - start,
        success: true,
        dependencyTypeName: "postgres",
      });
      return result;
    } catch (error) {
      trackDependency({
        name: "postgres.query",
        target: poolTarget,
        data: queryText,
        duration: Date.now() - start,
        success: false,
        dependencyTypeName: "postgres",
      });
      throw error;
    } finally {
      if (processId) {
        removeRequestDbProcessId(processId);
      }
    }
  }) as Pool["query"];
}

const originalConnect = pool.connect.bind(pool);
pool.connect = (async () => {
  const client = (await originalConnect()) as PoolClient;
  wrapQuery(client);
  return client;
}) as Pool["connect"];

wrapQuery(pool);

export function logDbMetadata(): void {
  logInfo("db_connection_metadata", {
    host: maskHost(dbMetadata.host),
    port: dbMetadata.port ?? "unknown",
    sslEnabled: dbMetadata.sslEnabled,
    pool: {
      max: poolConfig.max,
      min: poolConfig.min,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis,
      connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
    },
  });
}

export function logPoolStats(context: string): void {
  logInfo("db_pool_stats", {
    context,
    total: pool.totalCount ?? 0,
    idle: pool.idleCount ?? 0,
    waiting: pool.waitingCount ?? 0,
  });
}

export async function checkDb(): Promise<void> {
  try {
    await pool.query("select 1");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logError("db_unavailable", { error: message });
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type DbTestFailureMode =
  | "connection_timeout"
  | "pool_exhaustion"
  | "connection_reset";

type DbTestFailureInjection = {
  mode: DbTestFailureMode;
  remaining: number;
  matchQuery?: string;
};

let dbTestFailureInjection: DbTestFailureInjection | null = null;

export function setDbTestFailureInjection(
  config: { mode: DbTestFailureMode; remaining?: number; matchQuery?: string } | null
): void {
  if (!isTestEnvironment()) {
    return;
  }
  if (!config) {
    dbTestFailureInjection = null;
    return;
  }
  const remaining = Math.max(1, config.remaining ?? 1);
  dbTestFailureInjection = {
    mode: config.mode,
    remaining,
    matchQuery: config.matchQuery?.toLowerCase(),
  };
}

export function clearDbTestFailureInjection(): void {
  if (!isTestEnvironment()) {
    return;
  }
  dbTestFailureInjection = null;
}

type TestQueryControls = {
  delayMs: number;
  timeoutMs: number;
};

function getTestQueryControls(queryText: string): TestQueryControls {
  if (!isTestEnvironment()) {
    return { delayMs: 0, timeoutMs: 0 };
  }
  const pattern = process.env.DB_TEST_SLOW_QUERY_PATTERN;
  const delayMs = Math.max(0, Number(process.env.DB_TEST_SLOW_QUERY_MS ?? 0));
  const timeoutMs = Math.max(0, Number(process.env.DB_TEST_QUERY_TIMEOUT_MS ?? 0));
  if (!pattern || !queryText.toLowerCase().includes(pattern.toLowerCase())) {
    return { delayMs: 0, timeoutMs: 0 };
  }
  return { delayMs, timeoutMs };
}

function createTimeoutError(timeoutMs: number): Error {
  const error = new Error(`db_query_timeout_after_${timeoutMs}ms`);
  (error as { code?: string }).code = "ETIMEDOUT";
  return error;
}

function createInjectedFailure(mode: DbTestFailureMode): Error {
  switch (mode) {
    case "connection_timeout": {
      const error = new Error("db_connection_timeout");
      (error as { code?: string }).code = "ETIMEDOUT";
      return error;
    }
    case "pool_exhaustion": {
      const error = new Error("db_pool_exhausted");
      (error as { code?: string }).code = "53300";
      return error;
    }
    case "connection_reset": {
      const error = new Error("db_connection_reset");
      (error as { code?: string }).code = "ECONNRESET";
      return error;
    }
  }
}

function shouldInjectFailure(queryText: string): DbTestFailureMode | null {
  if (!isTestEnvironment() || !dbTestFailureInjection) {
    return null;
  }
  if (dbTestFailureInjection.remaining <= 0) {
    return null;
  }
  if (
    dbTestFailureInjection.matchQuery &&
    !queryText.toLowerCase().includes(dbTestFailureInjection.matchQuery)
  ) {
    return null;
  }
  return dbTestFailureInjection.mode;
}

async function runQueryWithTestControls(
  queryFn: (...args: Parameters<Pool["query"]>) => ReturnType<Pool["query"]>,
  args: Parameters<Pool["query"]>,
  queryText: string
): Promise<Awaited<ReturnType<Pool["query"]>>> {
  if (isTestEnvironment() && process.env.DB_TEST_FORCE_POOL_EXHAUSTION === "true") {
    const error = new Error("timeout acquiring a client");
    (error as { code?: string }).code = "ETIMEDOUT";
    throw error;
  }
  const injectedFailure = shouldInjectFailure(queryText);
  if (injectedFailure) {
    dbTestFailureInjection = dbTestFailureInjection
      ? {
          ...dbTestFailureInjection,
          remaining: dbTestFailureInjection.remaining - 1,
        }
      : null;
    if (dbTestFailureInjection && dbTestFailureInjection.remaining <= 0) {
      dbTestFailureInjection = null;
    }
    throw createInjectedFailure(injectedFailure);
  }
  const { delayMs, timeoutMs } = getTestQueryControls(queryText);
  const execute = async (): Promise<Awaited<ReturnType<Pool["query"]>>> => {
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    return queryFn(...args);
  };
  if (timeoutMs <= 0) {
    return execute();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(createTimeoutError(timeoutMs)), timeoutMs);
    execute()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function waitForDatabaseReady(): Promise<void> {
  const maxAttempts = Math.max(
    5,
    Number(process.env.DB_READY_ATTEMPTS ?? 5)
  );
  const baseDelayMs = Math.max(
    100,
    Number(process.env.DB_READY_BASE_DELAY_MS ?? 250)
  );

  logDbMetadata();
  logPoolStats("startup");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const start = Date.now();
    try {
      await pool.query("select 1");
      logInfo("db_ready", {
        attempt,
        durationMs: Date.now() - start,
      });
      return;
    } catch (err) {
      const durationMs = Date.now() - start;
      const message = err instanceof Error ? err.message : "unknown";
      logWarn("db_ready_attempt_failed", {
        attempt,
        durationMs,
        error: message,
      });
      if (attempt >= maxAttempts) {
        throw err;
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delayMs);
    }
  }
}

export async function warmUpDatabase(): Promise<void> {
  await pool.query("select 1");
  logPoolStats("warm_up");
}

export function assertPoolHealthy(): void {
  const { max, waitingCount, totalCount } = getPoolMetrics();
  if (waitingCount > 0 && totalCount >= max) {
    throw new Error("db_pool_exhausted");
  }
}

type PoolMetrics = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  max: number;
};

let testPoolMetricsOverride: Partial<PoolMetrics> | null = null;

export function setDbTestPoolMetricsOverride(
  override: Partial<PoolMetrics> | null
): void {
  if (!isTestEnvironment()) {
    return;
  }
  testPoolMetricsOverride = override ? { ...override } : null;
}

function getPoolMetrics(): PoolMetrics {
  const poolState = pool as {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
    options?: PoolConfig;
  };
  const metrics: PoolMetrics = {
    totalCount: poolState.totalCount ?? 0,
    idleCount: poolState.idleCount ?? 0,
    waitingCount: poolState.waitingCount ?? 0,
    max: poolState.options?.max ?? poolConfig.max ?? 0,
  };
  if (isTestEnvironment() && testPoolMetricsOverride) {
    return { ...metrics, ...testPoolMetricsOverride };
  }
  return metrics;
}

export function assertPoolHasFreeClient(): void {
  const { idleCount } = getPoolMetrics();
  if (idleCount < 1) {
    throw new Error("db_pool_no_free_client");
  }
}

export async function logBackupStatus(): Promise<void> {
  try {
    const res = await pool.query<{ name: string; setting: string }>(
      `select name, setting
       from pg_settings
       where name in ('backup_retention_days', 'geo_redundant_backup')`
    );
    const settings = new Map(res.rows.map((row) => [row.name, row.setting]));
    const retentionRaw = settings.get("backup_retention_days");
    const retentionDays = retentionRaw ? Number(retentionRaw) : null;
    const geoRedundant = settings.get("geo_redundant_backup") ?? "unknown";

    if (!retentionDays || retentionDays <= 0) {
      logWarn("backup_retention_disabled", { retentionDays, geoRedundant });
      return;
    }

    logInfo("backup_retention_configured", { retentionDays, geoRedundant });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logWarn("backup_retention_check_failed", { error: message });
  }
}

export function isDbConnectionFailure(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as { code?: string }).code?.toLowerCase();

  const knownCodes = new Set([
    "ecconnrefused",
    "econnrefused",
    "etimedout",
    "econnreset",
    "57p01",
    "57p02",
    "57p03",
    "53300",
  ]);

  if (code && knownCodes.has(code)) {
    return true;
  }

  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("connection terminated") ||
    message.includes("connection refused") ||
    message.includes("could not connect") ||
    message.includes("terminating connection") ||
    message.includes("db down") ||
    message.includes("db unavailable") ||
    message.includes("db_pool_exhausted") ||
    message.includes("db_pool_no_free_client")
  );
}

export function getDbFailureCategory(
  error: unknown
): "pool_exhausted" | "unavailable" | null {
  if (!error) {
    return null;
  }
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as { code?: string }).code?.toLowerCase();
  const poolSignals = new Set(["53300"]);

  if (code && poolSignals.has(code)) {
    return "pool_exhausted";
  }
  if (
    message.includes("db_pool_exhausted") ||
    message.includes("db_pool_no_free_client") ||
    message.includes("timeout acquiring a client")
  ) {
    return "pool_exhausted";
  }
  if (isDbConnectionFailure(error)) {
    return "unavailable";
  }
  return null;
}

type RequiredColumn = {
  table: string;
  column: string;
};

const requiredColumns: RequiredColumn[] = [
  // users
  { table: "users", column: "id" },
  { table: "users", column: "email" },
  { table: "users", column: "password_hash" },
  { table: "users", column: "role" },
  { table: "users", column: "active" },
  { table: "users", column: "password_changed_at" },
  { table: "users", column: "failed_login_attempts" },
  { table: "users", column: "locked_until" },
  { table: "users", column: "token_version" },
  { table: "users", column: "created_at" },
  { table: "users", column: "updated_at" },

  // auth
  { table: "auth_refresh_tokens", column: "id" },
  { table: "auth_refresh_tokens", column: "user_id" },
  { table: "auth_refresh_tokens", column: "token_hash" },
  { table: "auth_refresh_tokens", column: "expires_at" },
  { table: "auth_refresh_tokens", column: "revoked_at" },
  { table: "auth_refresh_tokens", column: "created_at" },
  { table: "refresh_tokens", column: "id" },
  { table: "refresh_tokens", column: "user_id" },
  { table: "refresh_tokens", column: "token_hash" },
  { table: "refresh_tokens", column: "expires_at" },
  { table: "refresh_tokens", column: "revoked_at" },

  { table: "password_resets", column: "id" },
  { table: "password_resets", column: "user_id" },
  { table: "password_resets", column: "token_hash" },
  { table: "password_resets", column: "expires_at" },
  { table: "password_resets", column: "used_at" },
  { table: "password_resets", column: "created_at" },

  // audit_events — ALIGNED TO LIVE DB (INTENTIONALLY DUPLICATIVE)
  { table: "audit_events", column: "id" },
  { table: "audit_events", column: "actor_user_id" },
  { table: "audit_events", column: "target_user_id" },
  { table: "audit_events", column: "target_type" },
  { table: "audit_events", column: "target_id" },
  { table: "audit_events", column: "event_type" },
  { table: "audit_events", column: "event_action" },
  { table: "audit_events", column: "action" },
  { table: "audit_events", column: "ip" },
  { table: "audit_events", column: "ip_address" },
  { table: "audit_events", column: "user_agent" },
  { table: "audit_events", column: "request_id" },
  { table: "audit_events", column: "success" },
  { table: "audit_events", column: "created_at" },

  // applications
  { table: "applications", column: "id" },
  { table: "applications", column: "owner_user_id" },
  { table: "applications", column: "name" },
  { table: "applications", column: "metadata" },
  { table: "applications", column: "product_type" },
  { table: "applications", column: "pipeline_state" },
  { table: "applications", column: "status" },
  { table: "applications", column: "created_at" },
  { table: "applications", column: "updated_at" },

  // documents
  { table: "documents", column: "id" },
  { table: "documents", column: "application_id" },
  { table: "documents", column: "owner_user_id" },
  { table: "documents", column: "title" },
  { table: "documents", column: "document_type" },
  { table: "documents", column: "version" },
  { table: "documents", column: "status" },
  { table: "documents", column: "created_at" },

  { table: "document_versions", column: "id" },
  { table: "document_versions", column: "document_id" },
  { table: "document_versions", column: "version" },
  { table: "document_versions", column: "metadata" },
  { table: "document_versions", column: "content" },
  { table: "document_versions", column: "created_at" },

  { table: "document_version_reviews", column: "id" },
  { table: "document_version_reviews", column: "document_version_id" },
  { table: "document_version_reviews", column: "status" },
  { table: "document_version_reviews", column: "reviewed_by_user_id" },
  { table: "document_version_reviews", column: "reviewed_at" },
];

export async function assertSchema(): Promise<void> {
  const res = await pool.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name
     from information_schema.columns
     where table_schema = 'public'`
  );

  const existing = new Set(
    res.rows.map((row) => `${row.table_name}.${row.column_name}`)
  );

  const missing = requiredColumns.filter(
    (item) => !existing.has(`${item.table}.${item.column}`)
  );

  if (missing.length > 0) {
    logError("schema_contract_violation", {
      missingColumns: missing.map((item) => `${item.table}.${item.column}`),
    });
    trackEvent({
      name: "schema_contract_violation",
      properties: buildTelemetryProperties({
        missingColumns: missing.map((item) => `${item.table}.${item.column}`),
      }),
    });
    throw new Error(
      `schema_mismatch_missing_columns:${missing
        .map((m) => `${m.table}.${m.column}`)
        .join(",")}`
    );
  }
}
