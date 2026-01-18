// src/db.ts
import { createHash, randomUUID as _randomUUID } from "crypto";
import pg, {
  type Pool as PgPool,
  type PoolConfig,
  type QueryConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import { getDbPoolConnectionTimeoutMs } from "./config";
import { trackDependency } from "./observability/appInsights";
import { logError, logInfo, logWarn } from "./observability/logger";
import { markNotReady } from "./startupState";

const { Pool } = pg;

function isTestMode(): boolean {
  return process.env.NODE_ENV === "test";
}

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

export const isPgMem = isTestMode();

const poolConfig = buildPoolConfig();

let pgMemPoolClass: (new (...args: any[]) => PgPool) | null = null;

function createPgMemPool(config: PoolConfig): PgPool {
  const { DataType, newDb } = require("pg-mem") as typeof import("pg-mem");
  const db = newDb({
    noAstCoverageCheck: true,
    autoCreateForeignKeyIndices: true,
  });

  // Register commonly used functions
  db.public.registerFunction({
    name: "md5",
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value: string) =>
      createHash("md5").update(value ?? "").digest("hex"),
  });

  db.public.registerFunction({
    name: "regexp_replace",
    args: [DataType.text, DataType.text, DataType.text, DataType.text],
    returns: DataType.text,
    implementation: (
      value: string | null,
      pattern: string,
      replacement: string,
      flags: string,
    ) => {
      if (value === null) return null;
      return value.replace(new RegExp(pattern, flags ?? ""), replacement);
    },
  });

  db.public.registerFunction({
    name: "length",
    args: [DataType.text],
    returns: DataType.integer,
    implementation: (value: string | null) =>
      value === null ? null : value.length,
  });

  // Register gen_random_uuid for uuid defaults
  db.public.registerFunction({
    name: "gen_random_uuid",
    args: [],
    returns: DataType.uuid,
    implementation: () => {
      try {
        if (typeof _randomUUID === "function") {
          return _randomUUID();
        }
      } catch {
        /* no-op */
      }
      const bytes = require("crypto").randomBytes(16);
      // simple uuid v4 implementation
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const toHex = (n: number) => n.toString(16).padStart(2, "0");
      return (
        toHex(bytes[0]) +
        toHex(bytes[1]) +
        toHex(bytes[2]) +
        toHex(bytes[3]) +
        "-" +
        toHex(bytes[4]) +
        toHex(bytes[5]) +
        "-" +
        toHex(bytes[6]) +
        toHex(bytes[7]) +
        "-" +
        toHex(bytes[8]) +
        toHex(bytes[9]) +
        "-" +
        toHex(bytes[10]) +
        toHex(bytes[11]) +
        toHex(bytes[12]) +
        toHex(bytes[13]) +
        toHex(bytes[14]) +
        toHex(bytes[15])
      );
    },
  });

  const adapter = db.adapters.createPg();
  pgMemPoolClass = adapter.Pool;
  const { connectionString, ...rest } = config;
  return new adapter.Pool(rest);
}

export const pool: PgPool = isPgMem ? createPgMemPool(poolConfig) : new Pool(poolConfig);

function extractQueryText(args: unknown[]): string | null {
  const first = args[0] as string | QueryConfig | undefined;
  if (typeof first === "string") return first;
  if (first && typeof (first as any).text === "string") {
    return (first as any).text;
  }
  return null;
}

function createQueryWrapper<T extends (...args: any[]) => Promise<any>>(originalQuery: T): T {
  return (async (...args: any[]) => {
    const queryText = extractQueryText(args);
    const start = Date.now();
    try {
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
}

const originalPoolQuery = pool.query.bind(pool);
pool.query = createQueryWrapper(originalPoolQuery);

const originalConnect = pool.connect.bind(pool);
pool.connect = (async (...args: any[]) => {
  const client = await originalConnect(...args);
  client.query = createQueryWrapper(client.query.bind(client));
  return client;
}) as any;

pool.on("connect", () => logInfo("db_client_connected"));
pool.on("error", (err) => {
  markNotReady("db_unavailable");
  logWarn("db_connection_error", { message: err.message });
});

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    logError("db_query_error", { message: err.message, code: err.code });
    throw err;
  }
}

export async function checkDb(): Promise<void> {
  await pool.query("select 1");
}

export async function warmUpDatabase(): Promise<void> {
  try {
    await pool.query("select 1");
    assertPoolHealthy();
  } catch (err) {
    markNotReady("db_unavailable");
    throw err;
  }
}

type PoolMetrics = {
  waitingCount: number;
  totalCount: number;
  idleCount: number;
  max: number;
};

let testPoolMetricsOverride: PoolMetrics | null = null;

export function setDbTestPoolMetricsOverride(metrics: PoolMetrics | null): void {
  testPoolMetricsOverride = metrics;
}

export function assertPoolHealthy(): void {
  if (!pool || typeof (pool as any).idleCount === "undefined") return;
  const metrics: PoolMetrics = testPoolMetricsOverride ?? {
    waitingCount: (pool as any).waitingCount ?? 0,
    totalCount: (pool as any).totalCount ?? 0,
    idleCount: (pool as any).idleCount ?? 0,
    max: (pool as any).options?.max ?? 10,
  };
  if (metrics.waitingCount > 0 && metrics.totalCount >= metrics.max) {
    const error: any = new Error("db_pool_exhausted");
    error.code = "db_pool_exhausted";
    throw error;
  }
}

export function isPgMemPool(input: any): boolean {
  if (!isPgMem || !pgMemPoolClass) return false;
  return input instanceof (pgMemPoolClass as any);
}

let testDbInitialized = false;

export async function initializeTestDatabase(): Promise<void> {
  if (!isTestMode() || testDbInitialized) return;
  testDbInitialized = true;

  const { runMigrations } = await import("./migrations");
  await runMigrations({ allowTest: true });

  // Ensure sequence exists for audit_events
  await pool.query(`
    do $$
    begin
      if not exists (
        select 1 from pg_class where relname = 'audit_events_id_seq'
      ) then
        create sequence audit_events_id_seq;
      end if;
    end$$;
  `);

  // Audit events: add missing columns
  await pool.query(`
    alter table audit_events
      add column if not exists actor_user_id uuid null,
      add column if not exists target_user_id uuid null,
      add column if not exists target_type text null,
      add column if not exists target_id text null,
      add column if not exists event_type text null,
      add column if not exists event_action text null,
      add column if not exists ip_address text null,
      add column if not exists user_agent text null,
      add column if not exists request_id uuid null,
      add column if not exists metadata jsonb null;
  `);

  // Modify id and created_at defaults and action nullability
  await pool.query(`
    alter table audit_events
      alter column id set data type uuid using id::uuid,
      alter column id set default gen_random_uuid(),
      alter column created_at set default now(),
      alter column action drop not null;
  `);

  // Applications: add missing columns with defaults
  await pool.query(`
    alter table applications
      add column if not exists owner_user_id uuid null,
      add column if not exists name text null,
      add column if not exists metadata jsonb null,
      add column if not exists product_type text not null default 'standard',
      add column if not exists updated_at timestamptz null,
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists pipeline_state text null;
  `);

  // Documents: add missing columns with defaults
  await pool.query(`
    alter table documents
      add column if not exists application_id uuid null,
      add column if not exists owner_user_id uuid null,
      add column if not exists title text null,
      add column if not exists document_type text not null default 'general',
      add column if not exists created_at timestamptz not null default now();
  `);

  // Document versions: add missing columns with defaults
  await pool.query(`
    alter table document_versions
      add column if not exists metadata jsonb null,
      add column if not exists content text null,
      add column if not exists version integer not null default 1,
      add column if not exists created_at timestamptz not null default now();
  `);

  // Document version reviews: add missing columns
  await pool.query(`
    alter table document_version_reviews
      add column if not exists status text null,
      add column if not exists reviewed_by_user_id uuid null,
      add column if not exists reviewed_at timestamptz null;
  `);

  // Lender submissions: add missing columns, set defaults, drop not null constraint on idempotency_key
  await pool.query(`
    alter table lender_submissions
      add column if not exists lender_id text not null default 'default',
      add column if not exists submitted_at timestamptz null,
      add column if not exists payload jsonb null,
      add column if not exists payload_hash text null,
      add column if not exists lender_response jsonb null,
      add column if not exists response_received_at timestamptz null,
      add column if not exists failure_reason text null,
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists updated_at timestamptz null;
  `);
  await pool.query(`
    alter table lender_submissions
      alter column idempotency_key drop not null;
  `);

  // Lender submission retries: add missing columns
  await pool.query(`
    alter table lender_submission_retries
      add column if not exists status text null,
      add column if not exists attempt_count integer not null default 0,
      add column if not exists next_attempt_at timestamptz null,
      add column if not exists last_error text null,
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists updated_at timestamptz null,
      add column if not exists canceled_at timestamptz null;
  `);

  // Create client_submissions if not exists
  await pool.query(`
    create table if not exists client_submissions (
      id uuid primary key default gen_random_uuid(),
      submission_key text not null unique,
      application_id uuid not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );
  `);

  // Create or modify password_resets
  await pool.query(`
    create table if not exists password_resets (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      token_hash text not null,
      expires_at timestamptz not null,
      used_at timestamptz null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    alter table password_resets
      add column if not exists token_hash text not null,
      add column if not exists expires_at timestamptz not null,
      add column if not exists used_at timestamptz null,
      add column if not exists created_at timestamptz not null default now();
  `);

  // Create or modify idempotency_keys and unique index
  await pool.query(`
    create table if not exists idempotency_keys (
      id uuid primary key default gen_random_uuid(),
      key text not null,
      route text not null,
      method text not null default 'POST',
      request_hash text null,
      response_code integer null,
      response_body jsonb null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    alter table idempotency_keys
      add column if not exists method text not null default 'POST',
      add column if not exists request_hash text null,
      add column if not exists response_code integer null,
      add column if not exists response_body jsonb null,
      add column if not exists created_at timestamptz not null default now();
  `);
  await pool.query(`
    do $$ begin
      if not exists (
        select 1 from pg_indexes
        where schemaname = 'public'
          and tablename = 'idempotency_keys'
          and indexname = 'idempotency_keys_key_route_idx'
      ) then
        create unique index idempotency_keys_key_route_idx on idempotency_keys (key, route);
      end if;
    end$$;
  `);
}

export async function resetTestDatabase(): Promise<void> {
  testDbInitialized = false;
  await initializeTestDatabase();
}
