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
        id text,
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

function splitSql(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(
      (statement) =>
        statement.length > 0 &&
        !/^alter\s+table\s+\w+$/i.test(statement)
    );
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
  const isTest = process.env.NODE_ENV === "test";

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue;
    }
    const rawSql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      const statements = splitSql(rawSql);
      for (const statement of statements) {
        if (isTest) {
          if (/^create\s+index/i.test(statement)) {
            continue;
          }
          if (/^alter\s+table\s+/i.test(statement)) {
            continue;
          }
        }
        await client.query(statement);
      }
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
