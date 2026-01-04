import fs from "fs";
import path from "path";
import { isPgMem, pool } from "./db";

const migrationsDir = path.join(process.cwd(), "migrations");

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
  await pool.query(
    `create table if not exists schema_migrations (
      id text,
      applied_at timestamp
    )`
  );
}

function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarQuoteTag: string | null = null;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === "*" && nextChar === "/") {
        current += nextChar;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (dollarQuoteTag) {
      current += char;
      if (char === "$") {
        const tagLength = dollarQuoteTag.length;
        const possibleTag = sql.slice(i - tagLength + 1, i + 1);
        if (possibleTag === dollarQuoteTag) {
          dollarQuoteTag = null;
        }
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "-" && nextChar === "-") {
        current += char + nextChar;
        i += 1;
        inLineComment = true;
        continue;
      }
      if (char === "/" && nextChar === "*") {
        current += char + nextChar;
        i += 1;
        inBlockComment = true;
        continue;
      }
      if (char === "$") {
        const tagMatch = sql.slice(i).match(/^\$[a-zA-Z0-9_]*\$/);
        if (tagMatch) {
          dollarQuoteTag = tagMatch[0];
          current += tagMatch[0];
          i += tagMatch[0].length - 1;
          continue;
        }
      }
    }

    if (char === "'" && !inDoubleQuote) {
      current += char;
      if (inSingleQuote && nextChar === "'") {
        current += nextChar;
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      current += char;
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

function normalizeStatementForPgMem(statement: string): string {
  let normalized = statement;
  normalized = normalized.replace(/create index if not exists/gi, "create index");
  normalized = normalized.replace(
    /alter table ([\w".]+)\s+add column if not exists/gi,
    "alter table $1 add column"
  );
  return normalized;
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
    const client = await pool.connect();
    try {
      await client.query("begin");
      const statements = splitSql(rawSql);
      for (const statement of statements) {
        const normalized = isPgMem ? normalizeStatementForPgMem(statement) : statement;
        await client.query(normalized);
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

export async function getSchemaVersion(): Promise<string> {
  await ensureMigrationsTable();
  const res = await pool.query<{ id: string }>(
    `select id
     from schema_migrations
     order by applied_at desc, id desc
     limit 1`
  );
  const latest = res.rows[0]?.id;
  if (!latest) {
    throw new Error("schema_version_missing");
  }
  return latest;
}
