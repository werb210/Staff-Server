import fs from "fs";
import path from "path";
import { pool } from "./db";

const migrationsDir = path.join(process.cwd(), "migrations");
function isTestDatabase(): boolean {
  return (
    process.env.NODE_ENV === "test" &&
    (!process.env.DATABASE_URL || process.env.DATABASE_URL === "pg-mem")
  );
}

function listMigrationFiles(): string[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

async function ensureMigrationsTable(): Promise<void> {
  if (isTestDatabase()) {
    await pool.query(
      `create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamp
      )`
    );
    return;
  }

  await pool.query(
    `create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamp not null
    )`
  );
}

function sanitizeMigrationForTests(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !/drop constraint/i.test(line))
    .join("\n");
}

async function fetchAppliedMigrations(): Promise<Set<string>> {
  const res = await pool.query<{ id: string }>(
    "select id from schema_migrations"
  );
  return new Set(res.rows.map((row) => row.id));
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const migrationFiles = listMigrationFiles();
  const applied = await fetchAppliedMigrations();

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue;
    }
    const rawSql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const sql = isTestDatabase() ? sanitizeMigrationForTests(rawSql) : rawSql;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into schema_migrations (id, applied_at) values ($1, now())",
        [file]
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function getPendingMigrations(): Promise<string[]> {
  await ensureMigrationsTable();
  const migrationFiles = listMigrationFiles();
  const applied = await fetchAppliedMigrations();
  return migrationFiles.filter((file) => !applied.has(file));
}

export async function assertNoPendingMigrations(): Promise<void> {
  const pending = await getPendingMigrations();
  if (pending.length > 0) {
    throw new Error(`pending_migrations:${pending.join(",")}`);
  }
}
