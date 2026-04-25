import type { Pool } from "pg";

export type GraphClient = {
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
  accessToken: string;
};

export async function getGraphForUser(
  db: Pool,
  userId: string,
): Promise<GraphClient | null> {
  const { rows } = await db.query<{ o365_access_token: string | null }>(
    "select o365_access_token from users where id = $1",
    [userId],
  );
  const token = rows[0]?.o365_access_token;
  if (!token) return null;
  return {
    accessToken: token,
    fetch: (path, init = {}) =>
      fetch(`https://graph.microsoft.com/v1.0${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(init.headers as Record<string, string> | undefined),
        },
      }),
  };
}
