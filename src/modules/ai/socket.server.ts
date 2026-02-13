import type { Server } from "http";
import { randomUUID } from "crypto";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { pool } from "../../db";

type SessionSocket = WebSocket & { sessionId?: string };

type SocketPayload = {
  type?: string;
  sessionId?: string;
  content?: string;
};

export function initChatSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: SessionSocket) => {
    ws.on("message", async (data: RawData) => {
      const payload = JSON.parse(data.toString()) as SocketPayload;

      if (payload.type === "join_session" && payload.sessionId) {
        ws.sessionId = payload.sessionId;
        return;
      }

      if (payload.type === "staff_message" && payload.sessionId && payload.content) {
        await pool.query(
          `insert into chat_messages (id, session_id, role, content)
           values ($1, $2, 'staff', $3)`,
          [randomUUID(), payload.sessionId, payload.content]
        );
      }
    });
  });

  return wss;
}
