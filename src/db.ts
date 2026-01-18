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

let pgMemPoolClass: (new (...args: never[]) => PgPool) | null = null;

function createPgMemPool(config: PoolConfig): PgPool {
  const { DataType, newDb } = require("pg-mem") as typeof import("pg-mem");

  const db = newDb({
    noAstCoverageCheck: true,
    autoCreateForeignKeyIndices: true,
  });

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
    implementation: (value: string | null, pattern: string, replacement: string, flags: string) => {
      if (value === null) return null;
      return value.replace(new RegExp(pattern, flags ?? ""), replacement);
    },
  });

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

export const pool: PgPool = isPgMem ? createPgMemPool(poolConfig) : new Pool(poolConfig);

function extractQueryText(args: unknown[]): string | null {
  const first = args[0] as string | QueryConfig | undefined;
  if (typeof first === "string") return first;
  if (first && typeof (first as any).text === "string") return (first as any).text;
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
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    logError("db_query_error", { message: err.message, code: err.code });
    throw err;
  }
}

let testDbInitialized = false;

export async function initializeTestDatabase(): Promise<void> {
  if (!isTestMode() || testDbInitialized) return;
  testDbInitialized = true;

  await pool.query(`
    create table if not exists users (
      id uuid primary key,
      email text not null,
      password_hash text not null,
      role text not null,
      active boolean not null,
      password_changed_at timestamptz null
    )
  `);

  await pool.query(`
    create table if not exists audit_events (
      id uuid primary key,
      user_id uuid null,
      actor_user_id uuid null,
      target_user_id uuid null,
      action text null,
      created_at timestamptz default now()
    )
  `);

  await pool.query(`
    create table if not exists applications (
      id text primary key,
      owner_user_id uuid null,
      pipeline_state text null,
      created_at timestamptz null
    )
  `);

  await pool.query(`
    create table if not exists documents (
      id text primary key,
      application_id text null,
      owner_user_id uuid null,
      created_at timestamptz null
    )
  `);

  const { runMigrations } = await import("./migrations");
  await runMigrations({ allowTest: true });
}

export async function resetTestDatabase(): Promise<void> {
  testDbInitialized = false;
  await initializeTestDatabase();
}
