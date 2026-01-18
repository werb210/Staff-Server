// src/db.ts
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
import { markNotReady } from "./startupState";

/*
 * Database initialization and utilities for both production and test environments.
 *
 * This module wraps pg.Pool and augments it with instrumentation for
 * Application Insights. In test mode, it uses pg-mem to provide an in-memory
 * PostgreSQL-compatible database. Migrations are executed through
 * runMigrations() from src/migrations.ts, but pg-mem skips certain ALTER
 * statements. To ensure tests reflect the production schema, initializeTestDatabase()
 * applies additional schema repairs after migrations have run.
 */

const { Pool } = pg;

function isTestMode(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Build the PoolConfig. In test mode we restrict pool size and timeouts to
 * prevent deadlocks during Jest runs.
 */
function buildPoolConfig(): PoolConfig {
  const config: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  };
  if (isTestMode()) {
    config.max = 2;
    config.idleTimeoutMillis = 1000;
    config.connectionTimeoutMillis = getDbPoolConnectionTimeoutMs();
  }
  return config;
}

/**
 * True when using pg-mem (test environment). Used by other modules to
 * conditionalise behaviour.
 */
export const isPgMem: boolean = isTestMode();

const poolConfig = buildPoolConfig();

// When using pg-mem, we need to hold onto the generated Pool class so we
// can detect pg-mem pools via instanceof checks.
let pgMemPoolClass: (new (...args: never[]) => PgPool) | null = null;

/**
 * Create a pg-mem backed Pool. Registers a handful of functions used by
 * migrations and runtime code.
 */
function createPgMemPool(config: PoolConfig): PgPool {
  const { DataType, newDb } = require("pg-mem") as typeof import("pg-mem");
  const db = newDb({
    noAstCoverageCheck: true,
    autoCreateForeignKeyIndices: true,
  });
  // Register md5() for hashing values (used in some migrations).
  db.public.registerFunction({
    name: "md5",
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value: string) => createHash("md5").update(value ?? "").digest("hex"),
  });
  // Register regexp_replace() wrapper for search/replace operations.
  db.public.registerFunction({
    name: "regexp_replace",
    args: [DataType.text, DataType.text, DataType.text, DataType.text],
    returns: DataType.text,
    implementation: (
      value: string | null,
      pattern: string,
      replacement: string,
      flags: string
    ) => {
      if (value === null) return null;
      return value.replace(new RegExp(pattern, flags ?? ""), replacement);
    },
  });
  // Register length() for computing string length.
  db.public.registerFunction({
    name: "length",
    args: [DataType.text],
    returns: DataType.integer,
    implementation: (value: string | null) => (value === null ? null : value.length),
  });
  const adapter = db.adapters.createPg();
  pgMemPoolClass = adapter.Pool;
  const { connectionString, ...rest } = config;
  return new adapter.Pool(rest);
}

/**
 * Exported pool instance. When in test mode, this uses pg-mem; otherwise
 * it connects to the real PostgreSQL instance configured via DATABASE_URL.
 */
export const pool: PgPool = isPgMem ? createPgMemPool(poolConfig) : new Pool(poolConfig);

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
 * Structure representing basic metrics for the PostgreSQL connection pool. These values
 * are used in tests to simulate pool exhaustion scenarios via setDbTestPoolMetricsOverride().
 */
type PoolMetrics = {
  waitingCount: number;
  totalCount: number;
  max: number;
};

/**
 * Wrap a query function (from the pool or a client) to capture telemetry.
 */
function createQueryWrapper<T extends (...args: any[]) => Promise<any>>(originalQuery: T): T {
  // Wrap the original query to include telemetry. Use Parameter and ReturnType generics
  // to ensure the wrapper has the same signature as the original function. Without
  // these generics, TypeScript may infer an incompatible tuple type when
  // spreading arguments, leading to TS2556 errors.
  const wrapped = async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> => {
    const queryText = extractQueryText(args as unknown[]);
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
    }
  };
  return wrapped as unknown as T;
}

// Wrap pool.query() and client.query() so telemetry is recorded for all queries.
const originalPoolQuery = pool.query.bind(pool);
pool.query = createQueryWrapper<typeof originalPoolQuery>(originalPoolQuery);

// Capture the original connect so we can wrap returned clients. We need
// the exact type of pool.connect (including overloads) to satisfy TypeScript.
const originalConnect = pool.connect.bind(pool);

/*
 * Override pool.connect() while preserving its overloads (callback and promise styles).
 * We use Parameters<typeof originalConnect> and ReturnType<typeof originalConnect> to ensure
 * the wrapper's signature matches exactly. Without this, TypeScript infers
 * incompatible types which can trigger TS2322 or TS2339 errors.
 */
const patchedConnect: typeof originalConnect = ((
  ...args: Parameters<typeof originalConnect>
) => {
  // If the first argument is a function, assume callback style. The return type is void.
  if (args.length > 0 && typeof args[0] === "function") {
    const callback = args[0] as (
      err: Error | undefined,
      client: PoolClient,
      done: (release?: any) => void
    ) => void;
    return originalConnect((err: any, client: any, done: any) => {
      if (!err && client) {
        (client as any).query = createQueryWrapper((client as any).query.bind(client));
      }
      callback(err, client, done);
    }) as ReturnType<typeof originalConnect>;
  }
  // Promise style: connect returns a Promise<PoolClient>.
  return (originalConnect() as unknown as Promise<PoolClient>).then((client: any) => {
    if (client) {
      (client as any).query = createQueryWrapper((client as any).query.bind(client));
    }
    return client;
  }) as ReturnType<typeof originalConnect>;
}) as unknown as typeof originalConnect;

// Assign patched connect to the pool. Casting to any is necessary because
// pg.Pool.connect has multiple overload signatures that TypeScript
// otherwise cannot reconcile with our wrapper implementation.
pool.connect = patchedConnect as any;

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

// Test mode tracking to ensure initializeTestDatabase() only runs once.
let testDbInitialized = false;

// Override metrics for assertPoolHealthy() during tests.
let testPoolMetricsOverride: PoolMetrics | null = null;

/**
 * Set or clear a test-only override for pool metrics. Passing null clears
 * any override. Used in dbConnection.test.ts to simulate pool exhaustion.
 */
export function setDbTestPoolMetricsOverride(
  override: PoolMetrics | null
): void {
  testPoolMetricsOverride = override;
}

/**
 * Assert that the database pool is healthy. In production this is a no-op.
 * In test mode it checks whether there are clients waiting for connections
 * and whether the total count has reached the pool max. If so, it throws
 * an error with code "db_pool_exhausted" to trigger a fast failure.
 */
export function assertPoolHealthy(): void {
  // Only enforce pool health checks in test mode or when explicitly using
  // pg-mem. Production code should not throw here.
  if (!isPgMem) {
    return;
  }
  const metrics = testPoolMetricsOverride ?? {
    waitingCount: (pool as any).waitingCount ?? 0,
    totalCount: (pool as any).totalCount ?? 0,
    max: (pool as any).options?.max ?? 0,
  };
  if (metrics.waitingCount > 0 && metrics.totalCount >= metrics.max) {
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
 * Determine whether a given pool instance is backed by pg-mem. Used by
 * dbRuntime.ts to decide whether to use advisory locks or in-memory locks.
 */
export function isPgMemPool(poolLike: PgPool): boolean {
  if (!pgMemPoolClass) {
    return false;
  }
  return poolLike instanceof (pgMemPoolClass as any);
}

/**
 * Initialize the database when running tests. This executes migrations
 * and then applies additional schema repairs so that the pg-mem schema
 * matches production expectations. It is idempotent and will only run once.
 */
export async function initializeTestDatabase(): Promise<void> {
  if (!isTestMode() || testDbInitialized) {
    return;
  }
  testDbInitialized = true;
  // Run migrations. pg-mem will skip ALTER statements that are not compatible.
  const { runMigrations } = await import("./migrations");
  await runMigrations({ allowTest: true });
  // Schema repairs for pg-mem. Many migrations add columns via ALTER TABLE,
  // which are skipped in test mode. We add those columns here.
  // Audit events columns
  const auditColumns: Array<{ name: string; type: string }> = [
    { name: "actor_user_id", type: "uuid null" },
    { name: "target_user_id", type: "uuid null" },
    { name: "target_type", type: "text null" },
    { name: "target_id", type: "text null" },
    { name: "event_type", type: "text null" },
    { name: "event_action", type: "text null" },
    { name: "ip_address", type: "text null" },
    { name: "user_agent", type: "text null" },
    { name: "request_id", type: "text null" },
    { name: "metadata", type: "jsonb null" },
  ];
  for (const col of auditColumns) {
    await pool.query(`alter table audit_events add column if not exists ${col.name} ${col.type}`);
  }
  // Allow action to be nullable
  await pool.query(`alter table audit_events alter column action drop not null`);
  // Ensure id and created_at defaults exist via sequence. Use text sequence as in prod.
  await pool.query(`create sequence if not exists audit_events_id_seq`);
  await pool.query(
    `alter table audit_events alter column id set default nextval('audit_events_id_seq')::text`
  );
  await pool.query(`alter table audit_events alter column created_at set default now()`);
  // Applications table repairs
  await pool.query(`alter table applications add column if not exists owner_user_id uuid`);
  await pool.query(`alter table applications add column if not exists name text`);
  await pool.query(`alter table applications add column if not exists metadata jsonb`);
  await pool.query(
    `alter table applications add column if not exists product_type text not null default 'standard'`
  );
  await pool.query(
    `alter table applications add column if not exists updated_at timestamp not null default now()`
  );
  await pool.query(
    `alter table applications add column if not exists created_at timestamp not null default now()`
  );
  await pool.query(
    `alter table applications add column if not exists pipeline_state text null`
  );
  // Documents table repairs
  await pool.query(`alter table documents add column if not exists application_id text`);
  await pool.query(`alter table documents add column if not exists owner_user_id uuid`);
  await pool.query(`alter table documents add column if not exists title text`);
  await pool.query(
    `alter table documents add column if not exists document_type text not null default 'general'`
  );
  await pool.query(
    `alter table documents add column if not exists created_at timestamp not null default now()`
  );
  // Document versions repairs (created via migrations, but ensure default columns)
  await pool.query(
    `alter table document_versions add column if not exists metadata jsonb not null default '{}'::jsonb`
  );
  await pool.query(
    `alter table document_versions add column if not exists content text not null default ''`
  );
  await pool.query(
    `alter table document_versions add column if not exists version integer not null default 0`
  );
  await pool.query(
    `alter table document_versions add column if not exists created_at timestamp not null default now()`
  );
  // Document version reviews repairs
  await pool.query(
    `alter table document_version_reviews add column if not exists status text not null default 'pending'`
  );
  await pool.query(
    `alter table document_version_reviews add column if not exists reviewed_by_user_id uuid null`
  );
  await pool.query(
    `alter table document_version_reviews add column if not exists reviewed_at timestamp not null default now()`
  );
  // Lender submissions repairs
  await pool.query(
    `alter table lender_submissions add column if not exists lender_id text not null default 'default'`
  );
  await pool.query(
    `alter table lender_submissions add column if not exists submitted_at timestamp null`
  );
  await pool.query(
    `alter table lender_submissions add column if not exists payload jsonb null`
  );
  await pool.query(
    `alter table lender_submissions add column if not exists payload_hash text null`
  );
  await pool.query(
    `alter table lender_submissions add column if not exists lender_response jsonb null`
  );
  await pool.query(
    `alter table lender_submissions add column if not exists response_received_at timestamp null`
  );
  await pool.query(
    `alter table lender_submissions add column if not exists failure_reason text null`
  );
  // idempotency_key no longer required to be not null
  await pool.query(
    `alter table lender_submissions alter column idempotency_key drop not null`
  );
  // Lender submission retries repairs
  await pool.query(
    `alter table lender_submission_retries add column if not exists status text not null default 'queued'`
  );
  await pool.query(
    `alter table lender_submission_retries add column if not exists attempt_count integer not null default 0`
  );
  await pool.query(
    `alter table lender_submission_retries add column if not exists next_attempt_at timestamp null`
  );
  await pool.query(
    `alter table lender_submission_retries add column if not exists last_error text null`
  );
  await pool.query(
    `alter table lender_submission_retries add column if not exists created_at timestamp not null default now()`
  );
  await pool.query(
    `alter table lender_submission_retries add column if not exists updated_at timestamp not null default now()`
  );
  await pool.query(
    `alter table lender_submission_retries add column if not exists canceled_at timestamp null`
  );
  // Client submissions repairs
  await pool.query(
    `create table if not exists client_submissions (
      id text primary key,
      submission_key text not null unique,
      application_id text not null,
      payload jsonb not null,
      created_at timestamp not null default now()
    )`
  );
  // Password resets repairs
  await pool.query(
    `create table if not exists password_resets (
      id uuid primary key,
      user_id uuid not null,
      token_hash text not null unique,
      expires_at timestamptz not null,
      used_at timestamptz null,
      created_at timestamp not null default now()
    )`
  );
  await pool.query(
    `alter table password_resets add column if not exists used_at timestamptz null`
  );
  await pool.query(
    `alter table password_resets add column if not exists created_at timestamp not null default now()`
  );
  // Ensure idempotency keys table exists with minimal required columns.
  // Migrations should create this table, but in case they are skipped we
  // create a compatible version here.
  await pool.query(
    `create table if not exists idempotency_keys (
      id text primary key,
      key text not null,
      route text not null,
      request_hash text null,
      response_code integer not null,
      response_body jsonb not null,
      created_at timestamp not null default now()
    )`
  );
  // Optionally ensure method column exists; if missing we'll add with default.
  await pool.query(
    `alter table idempotency_keys add column if not exists method text not null default 'POST'`
  );
  // Ensure idempotency key & route unique index. If migration created one, this is a no-op in pg-mem.
  await pool.query(
    `create unique index if not exists idempotency_keys_key_route_unique_idx on idempotency_keys (key, route)`
  );
}

/**
 * Reset the test database by clearing the initialization flag and calling
 * initializeTestDatabase() again. Useful for tests that need a clean schema.
 */
export async function resetTestDatabase(): Promise<void> {
  testDbInitialized = false;
  await initializeTestDatabase();
}
