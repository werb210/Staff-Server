import crypto from "node:crypto";
import { db } from "../db";

export async function createContinuation(applicationId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await db.query(
    `
      insert into continuation_sessions (application_id, token, expires_at)
      values ($1, $2, $3)
    `,
    [applicationId, token, expiresAt]
  );

  return token;
}

export async function getContinuation(token: string): Promise<string | null> {
  const { rows } = await db.query<{ application_id: string }>(
    `
      select application_id
      from continuation_sessions
      where token = $1 and expires_at > now()
    `,
    [token]
  );

  return rows[0]?.application_id ?? null;
}
