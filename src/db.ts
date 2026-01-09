import { Pool, type PoolClient, type PoolConfig } from "pg";
import { logError, logInfo, logWarn } from "./observability/logger";
import { trackDependency } from "./observability/appInsights";

export const isPgMem =
  process.env.NODE_ENV === "test" &&
  (!process.env.DATABASE_URL || process.env.DATABASE_URL === "pg-mem");

const poolConfig: PoolConfig = {
  max: 2,
  min: 0,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

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
      return {
        host: url.hostname,
        port,
        sslEnabled: true,
      };
    } catch {
      return {
        host: process.env.PGHOST ?? "unknown",
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        sslEnabled: true,
      };
    }
  }
  return {
    host: process.env.PGHOST ?? "unknown",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    sslEnabled: false,
  };
}

const dbMetadata = resolveDbMetadata();

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
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  });
}

export const pool = createPool();

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
    const start = Date.now();
    try {
      const result = await originalQuery(...args);
      trackDependency({
        name: "postgres.query",
        target: poolTarget,
        data: getQueryText(args),
        duration: Date.now() - start,
        success: true,
        dependencyTypeName: "postgresql",
      });
      return result;
    } catch (error) {
      trackDependency({
        name: "postgres.query",
        target: poolTarget,
        data: getQueryText(args),
        duration: Date.now() - start,
        success: false,
        dependencyTypeName: "postgresql",
      });
      throw error;
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

export async function checkDb(): Promise<void> {
  try {
    await pool.query("select 1");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logError("db_unavailable", { error: message });
    throw err;
  }
}

export async function warmUpDatabase(): Promise<void> {
  logDbMetadata();
  await checkDb();
}

export function assertPoolHealthy(): void {
  const poolOptions = (pool as { options?: PoolConfig }).options;
  const max = poolOptions?.max ?? poolConfig.max ?? 0;
  const waitingCount = pool.waitingCount ?? 0;
  const totalCount = pool.totalCount ?? 0;
  if (waitingCount > 0 && totalCount >= max) {
    throw new Error("db_pool_exhausted");
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

  // auth
  { table: "auth_refresh_tokens", column: "id" },
  { table: "auth_refresh_tokens", column: "user_id" },
  { table: "auth_refresh_tokens", column: "token_hash" },
  { table: "auth_refresh_tokens", column: "expires_at" },
  { table: "auth_refresh_tokens", column: "revoked_at" },
  { table: "auth_refresh_tokens", column: "created_at" },

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
  { table: "applications", column: "created_at" },
  { table: "applications", column: "updated_at" },

  // documents
  { table: "documents", column: "id" },
  { table: "documents", column: "application_id" },
  { table: "documents", column: "owner_user_id" },
  { table: "documents", column: "title" },
  { table: "documents", column: "document_type" },
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
    throw new Error(
      `schema_mismatch_missing_columns:${missing
        .map((m) => `${m.table}.${m.column}`)
        .join(",")}`
    );
  }
}
