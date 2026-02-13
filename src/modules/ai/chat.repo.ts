import { randomUUID } from "crypto";
import { pool } from "../../db";

export type ChatSessionRecord = {
  id: string;
  source: string;
  channel: string;
  status: "ai" | "human" | "closed";
  leadId: string | null;
};

export type ChatMessageRecord = {
  id: string;
  sessionId: string;
  role: "user" | "ai" | "staff" | "system";
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export async function createSession(params: {
  source: string;
  channel?: string;
  leadId?: string | null;
}): Promise<ChatSessionRecord> {
  const { rows } = await pool.query<{
    id: string;
    source: string;
    channel: string;
    status: "ai" | "human" | "closed";
    lead_id: string | null;
  }>(
    `insert into chat_sessions (id, source, channel, status, lead_id)
     values ($1, $2, $3, 'ai', $4)
     returning id, source, channel, status, lead_id`,
    [randomUUID(), params.source, params.channel ?? "text", params.leadId ?? null]
  );

  const created = rows[0];
  if (!created) {
    throw new Error("Could not create chat session.");
  }

  return {
    id: created.id,
    source: created.source,
    channel: created.channel,
    status: created.status,
    leadId: created.lead_id,
  };
}

export async function getSessionById(sessionId: string): Promise<ChatSessionRecord | null> {
  const { rows } = await pool.query<{
    id: string;
    source: string;
    channel: string;
    status: "ai" | "human" | "closed";
    lead_id: string | null;
  }>(
    `select id, source, channel, status, lead_id
     from chat_sessions where id = $1`,
    [sessionId]
  );

  const session = rows[0];
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    source: session.source,
    channel: session.channel,
    status: session.status,
    leadId: session.lead_id,
  };
}

export async function updateSessionStatus(
  sessionId: string,
  status: "ai" | "human" | "closed"
): Promise<void> {
  await pool.query(
    `update chat_sessions set status = $2, updated_at = now() where id = $1`,
    [sessionId, status]
  );
}

export async function addMessage(params: {
  sessionId: string;
  role: "user" | "ai" | "staff" | "system";
  message: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const payload = params.metadata ? JSON.stringify(params.metadata) : null;
  await pool.query(
    `insert into chat_messages (id, session_id, role, message, content, metadata)
     values ($1, $2, $3, $4, $4, $5::jsonb)`,
    [randomUUID(), params.sessionId, params.role, params.message, payload]
  );
}

export async function listMessagesBySession(sessionId: string): Promise<ChatMessageRecord[]> {
  const { rows } = await pool.query<{
    id: string;
    session_id: string;
    role: "user" | "ai" | "staff" | "system";
    message: string | null;
    content: string | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `select id, session_id, role, message, content, metadata, created_at
     from chat_messages
     where session_id = $1
     order by created_at asc`,
    [sessionId]
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    message: row.message ?? row.content ?? "",
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

export async function getMessageCount(sessionId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*)::text as count from chat_messages where session_id = $1`,
    [sessionId]
  );
  return Number(rows[0]?.count ?? "0");
}

export async function listSessionsByStatus(status: "human" | "ai" | "closed"): Promise<ChatSessionRecord[]> {
  const { rows } = await pool.query<{
    id: string;
    source: string;
    channel: string;
    status: "ai" | "human" | "closed";
    lead_id: string | null;
  }>(
    `select id, source, channel, status, lead_id
     from chat_sessions
     where status = $1
     order by updated_at desc`,
    [status]
  );

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    channel: row.channel,
    status: row.status,
    leadId: row.lead_id,
  }));
}
