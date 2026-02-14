import { Router } from "express";
import {
  chat,
  closeSession,
  createContinuation,
  escalate,
  tagStartupInterest,
} from "../controllers/ai.controller";

const router = Router();

router.post("/ai/chat", chat);
router.post("/ai/escalate", escalate);
router.post("/ai/startup-interest", tagStartupInterest);
router.post("/ai/continuation", createContinuation);
router.post("/ai/session/:sessionId/close", closeSession);

export default router;
