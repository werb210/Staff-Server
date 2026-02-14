import { Router } from "express";
import { safeHandler } from "../../middleware/safeHandler";
import { handleMessage, reportIssue, startSession, escalate } from "./ai.service";
import type { AiContext } from "./ai.types";

const router = Router();

router.post(
  "/session/start",
  safeHandler(async (req, res) => {
    const context = req.body?.context as AiContext;
    if (!["website", "client", "portal"].includes(context)) {
      res.status(400).json({ error: "Invalid context" });
      return;
    }
    const session = startSession(context);
    res.json({ sessionId: session.id });
  })
);

router.post(
  "/message",
  safeHandler(async (req, res) => {
    const { sessionId, message } = req.body;
    if (typeof sessionId !== "string" || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "sessionId and message are required" });
      return;
    }
    const reply = await handleMessage(sessionId, message);
    res.json(reply);
  })
);

router.post(
  "/escalate",
  safeHandler(async (req, res) => {
    const { sessionId } = req.body;
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }
    res.json(escalate(sessionId));
  })
);

router.post(
  "/report",
  safeHandler(async (req, res) => {
    const { sessionId, message, screenshot } = req.body;
    if (typeof sessionId !== "string" || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "sessionId and message are required" });
      return;
    }
    res.json(reportIssue(sessionId, message, screenshot));
  })
);

export default router;
