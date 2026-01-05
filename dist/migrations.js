"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
exports.getPendingMigrations = getPendingMigrations;
exports.assertNoPendingMigrations = assertNoPendingMigrations;
exports.getSchemaVersion = getSchemaVersion;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const migrationsDir = path_1.default.join(process.cwd(), "migrations");
function listMigrationFiles() {
    if (!fs_1.default.existsSync(migrationsDir)) {
        return [];
    }
    return fs_1.default
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort();
}
async function ensureMigrationsTable() {
    await db_1.pool.query(`create table if not exists schema_migrations (
      id text,
      applied_at timestamp
    )`);
}
function splitSql(sql) {
    const statements = [];
    let current = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;
    let dollarQuoteTag = null;
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
            }
            else {
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
function stripSqlComments(statement) {
    return statement
        .replace(/--.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
}
function hasExecutableSql(statement) {
    return stripSqlComments(statement).trim().length > 0;
}
function normalizeStatementForPgMem(statement) {
    let normalized = statement;
    normalized = normalized.replace(/create index if not exists/gi, "create index");
    normalized = normalized.replace(/drop index if exists/gi, "drop index");
    normalized = normalized.replace(/alter table ([\w".]+)\s+add column if not exists/gi, "alter table $1 add column");
    normalized = normalized.replace(/alter table ([\w".]+)\s+drop constraint if exists/gi, "alter table $1 drop constraint");
    return normalized;
}
function shouldIgnorePgMemMigrationError(statement, error) {
    if (!db_1.isPgMem || !(error instanceof Error)) {
        return false;
    }
    const message = error.message.toLowerCase();
    if (message.includes("already exists")) {
        if (/^\s*create index/i.test(statement)) {
            return true;
        }
    }
    if (message.includes("does not exist")) {
        if (/^\s*alter table[\s\S]+drop constraint/i.test(statement)) {
            return true;
        }
        if (/^\s*drop index/i.test(statement)) {
            return true;
        }
    }
    return false;
}
async function fetchAppliedMigrations() {
    const res = await db_1.pool.query("select id from schema_migrations");
    return new Set(res.rows.map((row) => row.id));
}
async function runMigrations() {
    await ensureMigrationsTable();
    const migrationFiles = listMigrationFiles();
    const applied = await fetchAppliedMigrations();
    for (const file of migrationFiles) {
        if (applied.has(file)) {
            continue;
        }
        const rawSql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), "utf8");
        const client = await db_1.pool.connect();
        try {
            await client.query("begin");
            const statements = splitSql(rawSql).filter(hasExecutableSql);
            for (const statement of statements) {
                const normalized = db_1.isPgMem ? normalizeStatementForPgMem(statement) : statement;
                if (!hasExecutableSql(normalized)) {
                    continue;
                }
                try {
                    await client.query(normalized);
                }
                catch (error) {
                    if (shouldIgnorePgMemMigrationError(normalized, error)) {
                        continue;
                    }
                    throw error;
                }
            }
            await client.query("insert into schema_migrations (id, applied_at) values ($1, now())", [file]);
            await client.query("commit");
        }
        catch (err) {
            await client.query("rollback");
            throw err;
        }
        finally {
            client.release();
        }
    }
}
async function getPendingMigrations() {
    await ensureMigrationsTable();
    const migrationFiles = listMigrationFiles();
    const applied = await fetchAppliedMigrations();
    return migrationFiles.filter((file) => !applied.has(file));
}
async function assertNoPendingMigrations() {
    const pending = await getPendingMigrations();
    if (pending.length > 0) {
        throw new Error(`pending_migrations:${pending.join(",")}`);
    }
}
async function getSchemaVersion() {
    await ensureMigrationsTable();
    const res = await db_1.pool.query(`select id
     from schema_migrations
     order by applied_at desc, id desc
     limit 1`);
    const latest = res.rows[0]?.id;
    if (!latest) {
        throw new Error("schema_version_missing");
    }
    return latest;
}
