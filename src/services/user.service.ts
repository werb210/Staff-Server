import { db } from "./db";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  createdAt: Date;
}

export async function getUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const result = await db.query(
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
  const result = await db.query(
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
  await db.query("UPDATE users SET refresh_token_hash = $1 WHERE id = $2", [
    refreshTokenHash,
    userId,
  ]);
}

export async function clearUserRefreshTokenHash(userId: string) {
  await db.query("UPDATE users SET refresh_token_hash = NULL WHERE id = $1", [
    userId,
  ]);
}
