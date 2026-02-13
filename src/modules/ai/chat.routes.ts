import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  closeChatSession,
  getHumanSessions,
  getSessionMessages,
  processChatMessage,
  requestHumanTakeover,
  startChatSession,
} from "./chat.service";

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat requests" },
  skip: () => process.env.NODE_ENV === "test",
});

router.post("/chat/start", chatLimiter, async (req, res) => {
  const source = typeof req.body?.source === "string" ? req.body.source : "website";

  const session = await startChatSession({
    source,
    channel: typeof req.body?.channel === "string" ? req.body.channel : "text",
    lead: req.body?.lead,
  });

  res.json({ sessionId: session.id, status: session.status });
});

router.post("/chat/message", chatLimiter, async (req, res) => {
  const { sessionId, message, source } = req.body as {
    sessionId?: string;
    message?: string;
    source?: string;
  };

  if (!sessionId || !message) {
    res.status(400).json({ error: "sessionId and message are required" });
    return;
  }

  const result = await processChatMessage({ sessionId, message, source: source ?? "website" });

  res.json({ status: result.status, response: result.response });
});

router.post("/chat/human", chatLimiter, async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }
  await requestHumanTakeover(sessionId);
  res.json({ status: "human" });
});

router.post("/chat/close", chatLimiter, async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }
  await closeChatSession(sessionId);
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
  const messages = await getSessionMessages(req.params.sessionId);
  res.json({ messages });
});

export default router;
