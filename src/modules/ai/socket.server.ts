import type { Server } from "http";
import { randomUUID } from "crypto";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { pool } from "../../db";

type SessionSocket = WebSocket & { sessionId?: string; isAlive?: boolean };

type SocketPayload = {
  type?: string;
  sessionId?: string;
  content?: string;
};

function safeParsePayload(data: RawData): SocketPayload | null {
  try {
    return JSON.parse(data.toString()) as SocketPayload;
  } catch {
    return null;
  }
}

async function attachTranscriptToCrm(sessionId: string): Promise<void> {
  const sessionResult = await pool.query<{ lead_id: string | null }>(
    "select lead_id from chat_sessions where id = $1 limit 1",
    [sessionId]
  );
  const leadId = sessionResult.rows[0]?.lead_id;
  if (!leadId) return;

  const messages = await pool.query<{ role: string; message: string | null; content: string | null; created_at: string }>(
    `select role, message, content, created_at
     from chat_messages
     where session_id = $1
     order by created_at asc`,
    [sessionId]
  );

  await pool.query(
    `insert into crm_lead_activities (id, lead_id, activity_type, payload)
     values ($1, $2, $3, $4::jsonb)`,
    [
      randomUUID(),
      leadId,
      "chat_transcript_closed",
      JSON.stringify({ sessionId, transcript: messages.rows }),
    ]
  );
}

export function initChatSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", (ws: SessionSocket) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data: RawData) => {
      const payload = safeParsePayload(data);
      if (!payload) {
        ws.send(JSON.stringify({ type: "error", message: "invalid_payload" }));
        return;
      }

      if (payload.type === "join_session" && payload.sessionId) {
        ws.sessionId = payload.sessionId;
        ws.send(JSON.stringify({ type: "joined", sessionId: payload.sessionId }));
        return;
      }

      if (payload.type === "staff_join" && payload.sessionId) {
        await pool.query(
          `update chat_sessions
           set status = 'human',
               staff_override = true,
               updated_at = now()
           where id = $1`,
          [payload.sessionId]
        );
        ws.send(JSON.stringify({ type: "transfer", sessionId: payload.sessionId, aiPaused: true }));
        return;
      }

      if (payload.type === "staff_message" && payload.sessionId && payload.content) {
        await pool.query(
          `insert into chat_messages (id, session_id, role, content)
           values ($1, $2, 'staff', $3)`,
          [randomUUID(), payload.sessionId, payload.content]
        );
        return;
      }

      if (payload.type === "close_chat" && payload.sessionId) {
        await pool.query(
          `update chat_sessions set status = 'closed', updated_at = now() where id = $1`,
          [payload.sessionId]
        );
        await attachTranscriptToCrm(payload.sessionId);
        return;
      }

    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      const socket = client as SessionSocket;
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 15000);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  return wss;
}
