import { Pool } from "pg"

let pool

export async function initTestDb() {
  if (pool) return pool

  pool = new Pool({
    connectionString:
      process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/test_db",
  })

  await pool.query("SELECT 1")

  return pool
}

export async function closeTestDb() {
  if (pool) {
    await pool.end()
  }
}

export default initTestDb
