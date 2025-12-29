import { hashPassword } from "../auth/password";
import { getPool } from "./db";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  createdAt: Date;
}

const memoryUsers = new Map<string, UserRecord>();
let memoryInitialized = false;

export async function initializeUserStore() {
  if (memoryInitialized) {
    return;
  }

  memoryInitialized = true;

  if (getPool()) {
    return;
  }

  const email = process.env.DEV_USER_EMAIL;
  const password = process.env.DEV_USER_PASSWORD;

  if (email && password) {
    const passwordHash = await hashPassword(password);
    memoryUsers.set(email, {
      id: "dev-user",
      email,
      passwordHash,
      refreshTokenHash: null,
      createdAt: new Date(),
    });
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const pool = getPool();
  if (!pool) {
    return memoryUsers.get(email) ?? null;
  }

  const result = await pool.query(
    "SELECT id, email, password_hash, refresh_token_hash, created_at FROM users WHERE email = $1",
    [email],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    email: row.email,
    passwordHash: row.password_hash,
    refreshTokenHash: row.refresh_token_hash,
    createdAt: row.created_at,
  };
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const pool = getPool();
  if (!pool) {
    for (const user of memoryUsers.values()) {
      if (user.id === id) {
        return user;
      }
    }
    return null;
  }

  const result = await pool.query(
    "SELECT id, email, password_hash, refresh_token_hash, created_at FROM users WHERE id = $1",
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    email: row.email,
    passwordHash: row.password_hash,
    refreshTokenHash: row.refresh_token_hash,
    createdAt: row.created_at,
  };
}

export async function setUserRefreshTokenHash(
  userId: string,
  refreshTokenHash: string,
) {
  const pool = getPool();
  if (!pool) {
    for (const user of memoryUsers.values()) {
      if (user.id === userId) {
        user.refreshTokenHash = refreshTokenHash;
      }
    }
    return;
  }

  await pool.query("UPDATE users SET refresh_token_hash = $1 WHERE id = $2", [
    refreshTokenHash,
    userId,
  ]);
}

export async function clearUserRefreshTokenHash(userId: string) {
  const pool = getPool();
  if (!pool) {
    for (const user of memoryUsers.values()) {
      if (user.id === userId) {
        user.refreshTokenHash = null;
      }
    }
    return;
  }

  await pool.query("UPDATE users SET refresh_token_hash = NULL WHERE id = $1", [
    userId,
  ]);
}
