import { db } from "../../db";

export type AISession = {
  id: string;
  source: string;
  status: string;
  contact_id: string | null;
  created_at: string;
  closed_at: string | null;
};

export async function createSession(source: string): Promise<AISession> {
  const result = await db.query<AISession>(
    `insert into ai_sessions (source) values ($1) returning *`,
    [source]
  );
  const session = result.rows[0];
  if (!session) {
    throw new Error("Could not create AI session.");
  }

  return session;
}

export async function addMessage(
  sessionId: string,
  role: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.query(
    `insert into ai_messages (session_id, role, content, metadata) values ($1, $2, $3, $4::jsonb)`,
    [sessionId, role, content, metadata ? JSON.stringify(metadata) : null]
  );
}
