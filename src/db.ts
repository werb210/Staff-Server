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
      if (value === null) {
        return null;
      }
      const regex = new RegExp(pattern, flags ?? "");
      return value.replace(regex, replacement);
    },
  });
  db.public.registerFunction({
    name: "length",
    args: [DataType.text],
    returns: DataType.integer,
    implementation: (value: string | null) => {
      if (value === null) {
        return null;
      }
      return value.length;
    },
  });
  const adapter = db.adapters.createPg();
  const { connectionString, ...rest } = config;
  return new adapter.Pool(rest);
}

export const pool: PgPool = isPgMem ? createPgMemPool(poolConfig) : new Pool(poolConfig);

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
  markNotReady("db_unavailable");
  logWarn("db_connection_error", {
    scope,
    message: error.message,
    code: (error as { code?: string }).code,
  });
}

pool.on("connect", (client) => {
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

let testDbInitialized = false;

export async function initializeTestDatabase(): Promise<void> {
  if (!isTestMode() || testDbInitialized) {
    return;
  }
  testDbInitialized = true;
  const statements = [
    `create table if not exists users (
       id uuid primary key,
       email text,
       password_hash text,
       role text,
       active boolean not null,
       password_changed_at timestamptz null,
       failed_login_attempts integer not null default 0,
       locked_until timestamptz null,
       token_version integer not null default 0,
       created_at timestamp not null default now(),
       updated_at timestamp not null default now(),
       phone_number text,
       phone_verified boolean default false,
       phone text,
       disabled boolean default false,
       is_active boolean
     )`,
    `insert into users (id, email, password_hash, role, active, password_changed_at)
     values (
       '00000000-0000-0000-0000-000000000001',
       'client-submission@system.local',
       '$2a$10$w6mUovSd.4MYgYusN4uT0.oVpi9oyaylVv4QOM4bLIKO7iHuUWLZa',
       'Referrer',
       false,
       now()
     )
     on conflict (id) do nothing`,
    `create table if not exists auth_refresh_tokens (
       id uuid primary key,
       user_id uuid,
       token_hash text,
       expires_at timestamptz not null,
       revoked_at timestamptz null,
       created_at timestamptz not null,
       token text null
     )`,
    `create table if not exists password_resets (
       id uuid primary key,
       user_id uuid,
       token_hash text,
       expires_at timestamptz not null,
       used_at timestamptz null,
       created_at timestamp not null default now()
     )`,
    `create table if not exists audit_events (
       id text primary key,
       user_id uuid null,
       action text null,
       ip text null,
       user_agent text null,
       success boolean not null,
       created_at timestamptz not null default now(),
       actor_user_id uuid null,
       target_user_id uuid null,
       target_type text null,
       target_id text null,
       event_type text null,
       event_action text null,
       ip_address text null,
       request_id text null,
       metadata jsonb null
     )`,
    `create table if not exists applications (
       id text primary key,
       owner_user_id uuid,
       name text,
       metadata jsonb null,
       pipeline_state text not null,
       created_at timestamp not null,
       updated_at timestamp not null,
       product_type text not null default 'standard',
       status text not null default 'NEW'
     )`,
    `create table if not exists documents (
       id text primary key,
       application_id text not null,
       owner_user_id uuid not null,
       title text not null,
       created_at timestamp not null,
       document_type text not null default 'general',
       version integer not null default 1,
       status text not null default 'uploaded'
     )`,
    `create table if not exists document_versions (
       id text primary key,
       document_id text not null,
       version integer not null,
       metadata jsonb not null,
       content text not null,
       created_at timestamp not null
     )`,
    `create table if not exists document_version_reviews (
       id text primary key,
       document_version_id text not null,
       status text not null,
       reviewed_by_user_id uuid null,
       reviewed_at timestamp not null
     )`,
    `create table if not exists lender_submissions (
       id text primary key,
       application_id text not null,
       status text not null,
       idempotency_key text null,
       created_at timestamp not null,
       updated_at timestamp not null,
       lender_id text not null default 'default',
       submitted_at timestamp null,
       payload jsonb null,
       payload_hash text null,
       lender_response jsonb null,
       response_received_at timestamp null,
       failure_reason text null
     )`,
    `create table if not exists client_submissions (
       id text primary key,
       submission_key text not null,
       application_id text not null,
       payload jsonb not null,
       created_at timestamp not null
     )`,
    `create table if not exists lender_submission_retries (
       id text primary key,
       submission_id text not null,
       status text not null,
       attempt_count integer not null default 0,
       next_attempt_at timestamp null,
       last_error text null,
       created_at timestamp not null,
       updated_at timestamp not null,
       canceled_at timestamp null
     )`,
    `create table if not exists idempotency_keys (
       id text primary key,
       key text not null,
       route text not null,
       method text not null default 'POST',
       request_hash text not null,
       response_code integer not null,
       response_body jsonb not null,
       created_at timestamp not null default now()
     )`,
    `create table if not exists otp_verifications (
       id uuid primary key,
       user_id uuid not null,
       phone text not null,
       verification_sid text null,
       status text not null,
       verified_at timestamptz null,
       created_at timestamptz not null default now()
     )`,
    `create table if not exists ocr_jobs (
       id text primary key,
       document_id text not null,
       application_id text not null,
       status text not null,
       attempt_count integer not null,
       max_attempts integer not null,
       next_attempt_at timestamp null,
       locked_at timestamp null,
       locked_by text null,
       last_error text null,
       created_at timestamp not null,
       updated_at timestamp not null
     )`,
    `create table if not exists ocr_results (
       id text primary key,
       document_id text not null,
       provider text not null,
       model text not null,
       extracted_text text not null,
       extracted_json jsonb null,
       meta jsonb null,
       created_at timestamp not null,
       updated_at timestamp not null
     )`,
    `create table if not exists ops_kill_switches (
       key text primary key,
       enabled boolean not null,
       updated_at timestamp not null
     )`,
    `create table if not exists ops_replay_jobs (
       id text primary key,
       scope text not null,
       started_at timestamp null,
       completed_at timestamp null,
       status text not null
     )`,
    `create table if not exists ops_replay_events (
       id text primary key,
       replay_job_id text null,
       source_table text not null,
       source_id text not null,
       processed_at timestamp null
     )`,
    `create table if not exists export_audit (
       id text primary key,
       actor_user_id uuid null,
       export_type text not null,
       filters jsonb not null,
       created_at timestamp not null
     )`,
    `create table if not exists reporting_daily_metrics (
       id text primary key,
       metric_date date not null,
       applications_created integer not null,
       applications_submitted integer not null,
       applications_approved integer not null,
       applications_declined integer not null,
       applications_funded integer not null,
       documents_uploaded integer not null,
       documents_approved integer not null,
       lender_submissions integer not null,
       created_at timestamp not null
     )`,
    `create table if not exists reporting_pipeline_snapshots (
       id text primary key,
       snapshot_at timestamp not null,
       pipeline_state text not null,
       application_count integer not null
     )`,
    `create table if not exists reporting_lender_performance (
       id text primary key,
       lender_id text not null,
       period_start date not null,
       period_end date not null,
       submissions integer not null,
       approvals integer not null,
       declines integer not null,
       funded integer not null,
       avg_decision_time_seconds integer not null,
       created_at timestamp not null
     )`,
    `create table if not exists reporting_pipeline_daily_snapshots (
       id text primary key,
       snapshot_date date not null,
       pipeline_state text not null,
       application_count integer not null,
       created_at timestamp not null
     )`,
    `create table if not exists reporting_application_volume_daily (
       id text primary key,
       metric_date date not null,
       product_type text not null,
       applications_created integer not null,
       applications_submitted integer not null,
       applications_approved integer not null,
       applications_declined integer not null,
       applications_funded integer not null,
       created_at timestamp not null
     )`,
    `create table if not exists reporting_document_metrics_daily (
       id text primary key,
       metric_date date not null,
       document_type text not null,
       documents_uploaded integer not null,
       documents_reviewed integer not null,
       documents_approved integer not null,
       created_at timestamp not null
     )`,
    `create table if not exists reporting_staff_activity_daily (
       id text primary key,
       metric_date date not null,
       staff_user_id uuid not null,
       action text not null,
       activity_count integer not null,
       created_at timestamp not null
     )`,
    `create table if not exists reporting_lender_funnel_daily (
       id text primary key,
       metric_date date not null,
       lender_id text not null,
       submissions integer not null,
       approvals integer not null,
       funded integer not null,
       created_at timestamp not null
     )`,
    `create or replace view vw_pipeline_current_state as
       select pipeline_state, count(*)::int as application_count
       from applications
       group by pipeline_state`,
    `create or replace view vw_application_conversion_funnel as
       select
         count(*)::int as applications_created,
         count(*) filter (where pipeline_state = 'LENDER_SUBMITTED')::int as applications_submitted,
         count(*) filter (where pipeline_state = 'APPROVED')::int as applications_approved,
         count(*) filter (where pipeline_state = 'FUNDED')::int as applications_funded
       from applications`,
    `create or replace view vw_document_processing_stats as
       select
         count(dv.id)::int as documents_uploaded,
         count(r.id)::int as documents_reviewed,
         count(*) filter (where r.status = 'accepted')::int as documents_approved,
         case
           when count(r.id) = 0 then 0
           else count(*) filter (where r.status = 'accepted')::numeric / count(r.id)::numeric
         end as approval_rate
       from document_versions dv
       left join document_version_reviews r on r.document_version_id = dv.id`,
    `create or replace view vw_lender_conversion as
       select
         ls.lender_id,
         count(*)::int as submissions,
         count(*) filter (where a.pipeline_state = 'APPROVED')::int as approvals,
         count(*) filter (where a.pipeline_state = 'DECLINED')::int as declines,
         count(*) filter (where a.pipeline_state = 'FUNDED')::int as funded,
         case
           when count(*) = 0 then 0
           else count(*) filter (where a.pipeline_state = 'APPROVED')::numeric / count(*)::numeric
         end as approval_rate,
         case
           when count(*) = 0 then 0
           else count(*) filter (where a.pipeline_state = 'FUNDED')::numeric / count(*)::numeric
         end as funding_rate
       from lender_submissions ls
       join applications a on a.id = ls.application_id
       group by ls.lender_id`,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}
