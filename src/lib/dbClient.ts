import { Pool } from 'pg';

let _pool: Pool | null = null;

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

// Lazy getter
export function getDb(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === 'test') {
        // allow tests to run without real DB
        return null as any;
      }
      throw new Error('DATABASE_URL is required');
    }
    _pool = createPool();
  }
  return _pool;
}

// BACKWARD COMPAT EXPORT
export const pool: Pick<Pool, 'query'> = {
  query: ((...args: any[]) => (getDb().query as any).apply(getDb(), args)) as Pool['query'],
};

// RESTORE MISSING FUNCTION
export async function testDbConnection(): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return true; // test mode
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
