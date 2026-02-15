import type { Server } from "http";
import { randomUUID } from "crypto";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { pool } from "../../db";
import { logError, logInfo } from "../../observability/logger";

type SessionSocket = WebSocket & { sessionId?: string; isAlive?: boolean; role?: "client" | "staff"; userId?: string; socketId?: string; crmLeadId?: string | null };

type ChatSessionState = "AI_ACTIVE" | "HUMAN_ACTIVE";

type SessionPresence = {
  state: ChatSessionState;
  sockets: Set<SessionSocket>;
  updatedAt: number;
  transferNotified: boolean;
};

type SocketPayload = {
  type?: string;
  sessionId?: string;
  content?: string;
  userId?: string;
  context?: string;
};

const sessionMap = new Map<string, SessionPresence>();
const messageWindowMap = new Map<string, { count: number; resetAt: number }>();
const MAX_CONCURRENT_SESSIONS = Number(process.env.CHAT_MAX_CONCURRENT_SESSIONS ?? 1000);
const IDLE_TIMEOUT_MS = Number(process.env.CHAT_IDLE_TIMEOUT_MS ?? 30 * 60 * 1000);
const MAX_MESSAGES_PER_WINDOW = Number(process.env.CHAT_MAX_MESSAGES_PER_10S ?? 100);
const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 4000];
const socketRegistry = new Map<string, { sessionId: string; crmLeadId: string | null; role: "client" | "staff" }>();

function getAllowedOrigins(): Set<string> {
  return new Set([process.env.CLIENT_URL, process.env.PORTAL_URL, process.env.WEBSITE_URL]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0));
}

function isAllowedWsOrigin(origin?: string): boolean {
  if (!origin) {
    return true;
  }
  return getAllowedOrigins().has(origin);
}

let shutdownHookInstalled = false;
let activeServer: WebSocketServer | null = null;

function safeParsePayload(data: RawData): SocketPayload | null {
  try {
    return JSON.parse(data.toString()) as SocketPayload;
  } catch {
    return null;
  }
}

function getOrCreatePresence(sessionId: string): SessionPresence {
  const existing = sessionMap.get(sessionId);
  if (existing) {
    return existing;
  }
  const created: SessionPresence = {
    state: "AI_ACTIVE",
    sockets: new Set<SessionSocket>(),
    updatedAt: Date.now(),
    transferNotified: false,
  };
  sessionMap.set(sessionId, created);
  return created;
}

function broadcast(sessionId: string, payload: Record<string, unknown>): void {
  const presence = sessionMap.get(sessionId);
  if (!presence) {
    return;
  }

  const encoded = JSON.stringify(payload);
  for (const socket of presence.sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(encoded);
    }
  }
}

async function ensureChatSessionExists(sessionId: string, context?: string): Promise<void> {
  try {
    await pool.query(
      `insert into chat_sessions (id, source, channel, status, context)
       values ($1, 'website', 'text', 'ai', $2)
       on conflict (id) do nothing`,
      [sessionId, context ?? "website"]
    );
    return;
  } catch {
    // continue to legacy fallback
  }

  try {
    await pool.query(
      `insert into chat_sessions (id, user_type, status, source)
       values ($1, 'guest', 'active', 'website')
       on conflict (id) do nothing`,
      [sessionId]
    );
  } catch {
    // Some deployments own session creation elsewhere; do not fail websocket join.
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

async function setSessionState(sessionId: string, state: ChatSessionState): Promise<void> {
  const presence = getOrCreatePresence(sessionId);
  presence.state = state;
  presence.updatedAt = Date.now();

  await pool.query(
    `update chat_sessions
     set status = $2,
         staff_override = $3,
         updated_at = now()
     where id = $1`,
    [sessionId, state === "HUMAN_ACTIVE" ? "human" : "active", state === "HUMAN_ACTIVE"]
  ).catch(async () => {
    await pool.query(
      `update chat_sessions
       set status = $2,
           updated_at = now()
       where id = $1`,
      [sessionId, state === "HUMAN_ACTIVE" ? "escalated" : "active"]
    ).catch(() => undefined);
  });

  logInfo("chat_session_state_changed", { sessionId, state });
}


async function getChatSessionLeadId(sessionId: string): Promise<string | null> {
  const lead = await pool.query<{ lead_id: string | null }>(
    "select lead_id from chat_sessions where id = $1 limit 1",
    [sessionId]
  );
  return lead.rows[0]?.lead_id ?? null;
}

function detachSocket(socket: SessionSocket): void {
  if (!socket.sessionId) {
    return;
  }
  const presence = sessionMap.get(socket.sessionId);
  if (!presence) {
    return;
  }

  presence.sockets.delete(socket);
  presence.updatedAt = Date.now();

  if (socket.socketId) {
    socketRegistry.delete(socket.socketId);
  }

  if (presence.sockets.size === 0) {
    void attachTranscriptToCrm(socket.sessionId).catch((error) => {
      logError("chat_transcript_attach_on_close_failed", {
        message: error instanceof Error ? error.message : String(error),
        sessionId: socket.sessionId,
      });
    });
  }
}

function canAcceptMessage(sessionId: string): boolean {
  const now = Date.now();
  const key = sessionId;
  const current = messageWindowMap.get(key);
  if (!current || current.resetAt <= now) {
    messageWindowMap.set(key, { count: 1, resetAt: now + 10000 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_MESSAGES_PER_WINDOW;
}

function installShutdownHooks(): void {
  if (shutdownHookInstalled) return;
  shutdownHookInstalled = true;

  const graceful = () => {
    if (!activeServer) return;
    for (const client of activeServer.clients) {
      try {
        client.close(1001, "server_shutdown");
      } catch {
        // noop
      }
    }
    activeServer.close();
  };

  process.once("SIGINT", graceful);
  process.once("SIGTERM", graceful);
}

export function initChatSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });
  activeServer = wss;
  installShutdownHooks();

  wss.on("connection", (ws: SessionSocket, req) => {
    if (!isAllowedWsOrigin(req.headers.origin)) {
      ws.close(1008, "forbidden_origin");
      return;
    }
    ws.isAlive = true;
    const url = new URL(req.url ?? "", "http://localhost");
    const handshakeSessionId = url.searchParams.get("sessionId");
    const handshakeUserId = url.searchParams.get("userId");
    const handshakeContext = url.searchParams.get("context") ?? undefined;
    if (handshakeSessionId && !/^[0-9a-fA-F-]{36}$/.test(handshakeSessionId)) {
      ws.close(1008, "invalid_session");
      return;
    }
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data: RawData) => {
      try {
        const payload = safeParsePayload(data);
        if (!payload) {
          ws.send(JSON.stringify({ type: "error", message: "invalid_payload" }));
          return;
        }

        const messageType = payload.type;

        if ((messageType === "join_session" || messageType === "connect") && (payload.sessionId || handshakeSessionId)) {
          const effectiveSessionId = payload.sessionId ?? handshakeSessionId;
          if (!effectiveSessionId) {
            ws.send(JSON.stringify({ type: "error", message: "invalid_session" }));
            return;
          }
          if (sessionMap.size >= MAX_CONCURRENT_SESSIONS && !sessionMap.has(effectiveSessionId)) {
            ws.send(JSON.stringify({ type: "error", message: "session_capacity_reached" }));
            ws.close(1013, "over_capacity");
            return;
          }

          ws.sessionId = effectiveSessionId;
          ws.role = "client";
          ws.userId = payload.userId?.trim() || handshakeUserId?.trim() || `guest_${randomUUID()}`;
          ws.socketId = randomUUID();

          await ensureChatSessionExists(effectiveSessionId, payload.context ?? handshakeContext);
          ws.crmLeadId = await getChatSessionLeadId(effectiveSessionId);
          socketRegistry.set(ws.socketId, {
            sessionId: effectiveSessionId,
            crmLeadId: ws.crmLeadId ?? null,
            role: "client",
          });

          const presence = getOrCreatePresence(effectiveSessionId);
          presence.sockets.add(ws);
          presence.updatedAt = Date.now();

          ws.send(JSON.stringify({
            type: "joined",
            sessionId: effectiveSessionId,
            reconnect: true,
            reconnectBackoffMs: RECONNECT_BACKOFF_MS,
            state: presence.state,
            socketId: ws.socketId,
            crmLeadId: ws.crmLeadId ?? null,
          }));
          if (presence.state === "HUMAN_ACTIVE") {
            ws.send(JSON.stringify({
              type: "transferring",
              sessionId: effectiveSessionId,
              state: "HUMAN_ACTIVE",
              message: "Transferring you…",
            }));
          }
          logInfo("chat_ws_join", { sessionId: effectiveSessionId, role: "client" });
          return;
        }

        if ((messageType === "staff_join" || messageType === "staff_joined") && payload.sessionId) {
          if (!payload.userId || payload.userId.trim().length === 0) {
            ws.send(JSON.stringify({ type: "error", message: "unauthorized" }));
            return;
          }
          if (sessionMap.size >= MAX_CONCURRENT_SESSIONS && !sessionMap.has(payload.sessionId)) {
            ws.send(JSON.stringify({ type: "error", message: "session_capacity_reached" }));
            ws.close(1013, "over_capacity");
            return;
          }

          ws.sessionId = payload.sessionId;
          ws.role = "staff";
          ws.userId = payload.userId;
          ws.socketId = randomUUID();

          await ensureChatSessionExists(payload.sessionId);
          ws.crmLeadId = await getChatSessionLeadId(payload.sessionId);
          socketRegistry.set(ws.socketId, {
            sessionId: payload.sessionId,
            crmLeadId: ws.crmLeadId ?? null,
            role: "staff",
          });

          const presence = getOrCreatePresence(payload.sessionId);
          presence.sockets.add(ws);

          await setSessionState(payload.sessionId, "HUMAN_ACTIVE");

          broadcast(payload.sessionId, {
            type: "staff_joined",
            sessionId: payload.sessionId,
            state: "HUMAN_ACTIVE",
            aiStopped: true,
          });
          if (!presence.transferNotified) {
            presence.transferNotified = true;
            broadcast(payload.sessionId, {
              type: "transferring",
              sessionId: payload.sessionId,
              state: "HUMAN_ACTIVE",
              message: "Transferring you…",
            });
          }

          logInfo("chat_ws_join", { sessionId: payload.sessionId, role: "staff" });
          return;
        }

        if ((messageType === "staff_leave" || messageType === "transfer") && payload.sessionId) {
          await setSessionState(payload.sessionId, "AI_ACTIVE");
          const presence = getOrCreatePresence(payload.sessionId);
          presence.transferNotified = false;
          broadcast(payload.sessionId, {
            type: "transfer",
            sessionId: payload.sessionId,
            state: "AI_ACTIVE",
          });
          return;
        }

        if ((messageType === "staff_message" || messageType === "user_message" || messageType === "ai_message") && payload.sessionId && payload.content) {
          if (!canAcceptMessage(payload.sessionId)) {
            ws.send(JSON.stringify({ type: "error", message: "rate_limited" }));
            return;
          }

          const role = messageType === "staff_message" ? "staff" : messageType === "ai_message" ? "ai" : "user";
          const presence = getOrCreatePresence(payload.sessionId);
          if (messageType === "ai_message" && presence.state === "HUMAN_ACTIVE") {
            ws.send(JSON.stringify({ type: "suppressed", reason: "staff_active" }));
            return;
          }
          await pool.query(
            `insert into chat_messages (id, session_id, role, content)
             values ($1, $2, $3, $4)`,
            [randomUUID(), payload.sessionId, role, payload.content]
          );
          broadcast(payload.sessionId, {
            type: messageType,
            sessionId: payload.sessionId,
            role,
            content: payload.content,
          });
          return;
        }

        if ((messageType === "close_chat" || messageType === "close_session") && payload.sessionId) {
          await pool.query(
            `update chat_sessions set status = 'closed', updated_at = now() where id = $1`,
            [payload.sessionId]
          );
          await attachTranscriptToCrm(payload.sessionId);
          broadcast(payload.sessionId, {
            type: "close_session",
            sessionId: payload.sessionId,
          });
          sessionMap.delete(payload.sessionId);
          return;
        }
      } catch (error) {
        logError("chat_ws_message_failed", {
          message: error instanceof Error ? error.message : String(error),
          sessionId: ws.sessionId ?? null,
        });
        ws.send(JSON.stringify({ type: "error", message: "server_error" }));
      }
    });

    ws.on("close", () => {
      detachSocket(ws);
      logInfo("chat_ws_close", { sessionId: ws.sessionId ?? null, role: ws.role ?? null });
    });

    ws.on("error", (error) => {
      logError("chat_ws_socket_error", {
        sessionId: ws.sessionId ?? null,
        role: ws.role ?? null,
        message: error instanceof Error ? error.message : String(error),
      });
      detachSocket(ws);
    });
  });


  const idleCleanup = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, presence] of sessionMap.entries()) {
      if (presence.sockets.size === 0 || now - presence.updatedAt > IDLE_TIMEOUT_MS) {
        sessionMap.delete(sessionId);
        messageWindowMap.delete(sessionId);
        for (const [socketId, value] of socketRegistry.entries()) {
          if (value.sessionId === sessionId) {
            socketRegistry.delete(socketId);
          }
        }
      }
    }
  }, 30000);

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
    clearInterval(idleCleanup);
  });

  return wss;
}
