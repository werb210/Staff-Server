import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  closeChatSession,
  getHumanSessions,
  getSessionMessages,
  processChatMessage,
  requestHumanTakeover,
  startChatSession,
} from "./chat.service";
import { sanitizedString, sessionIdSchema } from "../../validation/public.validation";

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "rate_limited" },
  skip: () => process.env.NODE_ENV === "test",
});

const startChatSchema = z.object({
  source: sanitizedString(64).optional().default("website"),
  channel: sanitizedString(32).optional().default("text"),
  lead: z.record(z.unknown()).optional(),
});

const messageChatSchema = z.object({
  sessionId: sessionIdSchema,
  message: sanitizedString(4000),
  source: sanitizedString(64).optional(),
});

const sessionOnlySchema = z.object({
  sessionId: sessionIdSchema,
});

async function createSessionHandler(req: Request, res: Response): Promise<void> {
  const parsed = startChatSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "invalid_payload" });
    return;
  }

  const session = await startChatSession(parsed.data);

  res.status(201).json({ success: true, data: { sessionId: session.id, status: session.status } });
}

router.post("/chat/start", chatLimiter, createSessionHandler);
router.post("/chat/session", chatLimiter, createSessionHandler);

router.post("/chat/message", chatLimiter, async (req, res) => {
  const parsed = messageChatSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({ success: false, error: "invalid_payload" });
    return;
  }

  const { sessionId, message, source } = parsed.data;
  const result = await processChatMessage({ sessionId, message, source: source ?? "website" });

  res.json({ status: result.status, response: result.response });
});

async function transferChatHandler(req: Request, res: Response): Promise<void> {
  const parsed = sessionOnlySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "sessionId is required" });
    return;
  }
  try {
    await requestHumanTakeover(parsed.data.sessionId);
  } catch (error) {
    if (error instanceof Error && error.message === "chat_session_not_found") {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    throw error;
  }
  res.json({ status: "human" });
}

router.post("/chat/human", chatLimiter, transferChatHandler);
router.post("/chat/transfer", chatLimiter, transferChatHandler);

router.post("/chat/close", chatLimiter, async (req, res) => {
  const parsed = sessionOnlySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "sessionId is required" });
    return;
  }
  await closeChatSession(parsed.data.sessionId);
  res.json({ status: "closed" });
});

router.get("/chat/sessions", async (req, res) => {
  const status = req.query.status;
  if (status !== "human") {
    res.status(400).json({ error: "Only status=human is currently supported" });
    return;
  }

  const sessions = await getHumanSessions();
  res.json({ sessions });
});

router.get("/chat/:sessionId/messages", async (req, res) => {
  const parsed = sessionIdSchema.safeParse(req.params.sessionId);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "invalid_session_id" });
    return;
  }
  const messages = await getSessionMessages(parsed.data);
  res.json({ messages });
});

export default router;
