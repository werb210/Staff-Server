import pg, { type QueryResult, type QueryResultRow } from "pg";
import { logError, logInfo, logWarn } from "./observability/logger";
import { setDbConnected } from "./startupState";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
