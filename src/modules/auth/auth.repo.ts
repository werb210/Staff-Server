import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";
import { type Role } from "../../auth/roles";

type Queryable = Pick<PoolClient, "query">;

export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  active: boolean;
  password_changed_at?: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  token_version: number;
}

/**
 * IMPORTANT:
 * - information_schema is schema-wide
 * - Azure Postgres WILL lie unless schema is constrained
 * - Cache result to avoid per-request metadata scans
 */
let cachedHasPasswordChangedAt: boolean | null = null;

async function hasPasswordChangedAtColumn(
  client?: Queryable
): Promise<boolean> {
  if (cachedHasPasswordChangedAt !== null) {
    return cachedHasPasswordChangedAt;
  }

  const runner = client ?? pool;

  const res = await runner.query(
    `
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'password_changed_at'
    limit 1
    `
  );

  cachedHasPasswordChangedAt = (res.rowCount ?? 0) > 0;
  return cachedHasPasswordChangedAt;
}

export async function findAuthUserByEmail(
  email: string
): Promise<AuthUser | null> {
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn();

  const columns = hasPasswordChangedAt
    ? `
      id, email, password_hash, role, active,
      password_changed_at, failed_login_attempts,
      locked_until, token_version
    `
    : `
      id, email, password_hash, role, active,
      failed_login_attempts, locked_until, token_version
    `;

  const res = await pool.query<AuthUser>(
    `select ${columns} from users where email = $1 limit 1`,
    [email]
  );

  return res.rows[0] ?? null;
}

export async function findAuthUserById(
  id: string
): Promise<AuthUser | null> {
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn();

  const columns = hasPasswordChangedAt
    ? `
      id, email, password_hash, role, active,
      password_changed_at, failed_login_attempts,
      locked_until, token_version
    `
    : `
      id, email, password_hash, role, active,
      failed_login_attempts, locked_until, token_version
    `;

  const res = await pool.query<AuthUser>(
    `select ${columns} from users where id = $1 limit 1`,
    [id]
  );

  return res.rows[0] ?? null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  role: Role;
  client?: Queryable;
}): Promise<AuthUser> {
  const runner = params.client ?? pool;
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn(runner);

  const columns = hasPasswordChangedAt
    ? `(id, email, password_hash, role, active, password_changed_at)`
    : `(id, email, password_hash, role, active)`;

  const values = hasPasswordChangedAt
    ? `($1, $2, $3, $4, true, now())`
    : `($1, $2, $3, $4, true)`;

  const returning = hasPasswordChangedAt
    ? `
      id, email, password_hash, role, active,
      password_changed_at, failed_login_attempts,
      locked_until, token_version
    `
    : `
      id, email, password_hash, role, active,
      failed_login_attempts, locked_until, token_version
    `;

  const res = await runner.query<AuthUser>(
    `insert into users ${columns}
     values ${values}
     returning ${returning}`,
    [randomUUID(), params.email, params.passwordHash, params.role]
  );

  return res.rows[0];
}

export async function updatePassword(
  userId: string,
  passwordHash: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn(runner);

  const setClause = hasPasswordChangedAt
    ? `password_hash = $1, password_changed_at = now()`
    : `password_hash = $1`;

  await runner.query(
    `update users set ${setClause} where id = $2`,
    [passwordHash, userId]
  );
}

/* REMAINDER OF FILE UNCHANGED */
