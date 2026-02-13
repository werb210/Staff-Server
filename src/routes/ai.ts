import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import { randomUUID } from "crypto";
import { safeHandler } from "../middleware/safeHandler";
import { pool } from "../db";
import { saveKnowledge as saveKnowledgeDb } from "../services/aiKnowledgeService";
import { loadKnowledge, saveKnowledge } from "../modules/ai/knowledge.service";
import { AIKnowledgeController, upload as knowledgeUpload } from "../modules/ai/knowledge.controller";
import { logger } from "../utils/logger";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Invalid file type"));
      return;
    }
    cb(null, true);
  },
});

const uploadDir = path.join(process.cwd(), "uploads", "ai-issues");

function ensureUploadDir(): void {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

async function tryStoreEscalation(payload: {
  sessionId: string;
  escalatedTo?: string | null;
  messages?: unknown;
}): Promise<string> {
  const escalationId = randomUUID();
  try {
    await pool.query(
      `update chat_sessions
       set status = 'escalated', escalated_to = $2, updated_at = now()
       where id = $1`,
      [payload.sessionId, payload.escalatedTo ?? null]
    );

    await pool.query(
      `insert into ai_escalations (id, session_id, messages, status, created_at)
       values ($1, $2, $3::jsonb, 'open', now())`,
      [escalationId, payload.sessionId, JSON.stringify(payload.messages ?? [])]
    );
  } catch (error) {
    logger.warn("ai_escalation_store_failed", {
      sessionId: payload.sessionId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
  return escalationId;
}

async function tryStoreReport(payload: {
  message: string;
  screenshot?: string | null;
  context?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const reportId = randomUUID();

  try {
    await pool.query(
      `insert into issue_reports (id, description, screenshot_base64, user_agent, status, created_at)
       values ($1, $2, $3, $4, 'open', now())`,
      [
        reportId,
        payload.message,
        payload.screenshot ?? null,
        String(payload.metadata?.userAgent ?? ""),
      ]
    );
  } catch (error) {
    logger.warn("ai_report_store_failed", {
      reportId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  return reportId;
}

router.post(
  "/chat",
  safeHandler(async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const sessionId =
      typeof req.body?.sessionId === "string" && req.body.sessionId.trim().length > 0
        ? req.body.sessionId
        : randomUUID();

    try {
      await pool.query(
        `insert into chat_sessions (id, user_type, status, escalated_to, created_at, updated_at)
         values ($1, 'guest', 'active', null, now(), now())
         on conflict (id) do update set updated_at = now()`,
        [sessionId]
      );
      await pool.query(
        `insert into chat_messages (id, session_id, role, message, metadata, created_at)
         values ($1, $2, 'user', $3, null, now())`,
        [randomUUID(), sessionId, message]
      );
    } catch (error) {
      logger.warn("ai_chat_store_failed", {
        sessionId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }

    const reply = "Thanks for reaching out. We received your message and will assist shortly.";
    res.status(200).json({
      reply,
      message: reply,
      escalationAvailable: true,
    });
  })
);

router.post(
  "/escalate",
  safeHandler(async (req, res) => {
    const sessionId =
      typeof req.body?.sessionId === "string" && req.body.sessionId.trim().length > 0
        ? req.body.sessionId
        : randomUUID();

    const escalationId = await tryStoreEscalation({
      sessionId,
      escalatedTo: typeof req.body?.escalatedTo === "string" ? req.body.escalatedTo : null,
      messages: req.body?.messages,
    });

    res.status(202).json({
      acknowledged: true,
      ok: true,
      escalationId,
      sessionId,
    });
  })
);

router.post(
  "/report",
  safeHandler(async (req, res) => {
    const message =
      typeof req.body?.message === "string" && req.body.message.trim().length > 0
        ? req.body.message
        : "Issue report received";
    const screenshot =
      typeof req.body?.screenshot === "string" && req.body.screenshot.length > 0
        ? req.body.screenshot
        : null;

    const reportId = await tryStoreReport({
      message,
      screenshot,
      context: req.body?.context,
      metadata:
        typeof req.body === "object" && req.body !== null
          ? (req.body as Record<string, unknown>)
          : {},
    });

    logger.info("ai_report_received", {
      reportId,
      hasScreenshot: Boolean(screenshot),
      hasContext: Boolean(req.body?.context),
    });

    res.status(202).json({
      accepted: true,
      reportId,
    });
  })
);

router.post("/knowledge/upload", knowledgeUpload.single("file"), AIKnowledgeController.upload);
router.get("/knowledge", AIKnowledgeController.list);

router.get(
  "/knowledge/db",
  safeHandler(async (_req, res) => {
    const { rows } = await pool.query<{
      id: string;
      content: string;
      created_at: string;
    }>(
      `select id, content, created_at
       from ai_knowledge
       order by created_at desc`
    );
    res.json({ success: true, data: rows });
  })
);

router.post(
  "/knowledge",
  safeHandler(async (req, res) => {
    const { title, content, sourceType } = req.body as {
      title?: string;
      content?: string;
      sourceType?: "spec_sheet" | "faq" | "internal" | "product";
    };

    if (!content) {
      res.status(400).json({ success: false, error: "Missing content" });
      return;
    }

    const resolvedTitle = title ?? "Knowledge Entry";
    const resolvedSourceType = sourceType ?? "internal";

    await saveKnowledgeDb({
      title: resolvedTitle,
      content,
      sourceType: resolvedSourceType,
    });

    const existing = loadKnowledge();
    existing.push({ title: resolvedTitle, content, createdAt: new Date().toISOString() });
    saveKnowledge(existing);

    res.json({ success: true, data: { saved: true } });
  })
);

router.post(
  "/report-issue",
  upload.single("screenshot"),
  safeHandler(async (req, res) => {
    const body = req.body as {
      session_id?: string;
      description?: string;
      page_url?: string;
      browser_info?: string;
    };

    if (!body.description || !body.page_url || !body.browser_info) {
      res.status(400).json({
        success: false,
        error: "description, page_url, and browser_info are required",
      });
      return;
    }

    let screenshotPath: string | null = null;
    if (req.file) {
      ensureUploadDir();
      const ext = path.extname(req.file.originalname || "") || ".png";
      const fileName = `${randomUUID()}${ext}`;
      const fullPath = path.join(uploadDir, fileName);
      fs.writeFileSync(fullPath, req.file.buffer);
      screenshotPath = path.relative(process.cwd(), fullPath);
    }

    const id = randomUUID();
    await pool.query(
      `insert into issue_reports
       (id, session_id, description, page_url, browser_info, screenshot_path, status, created_at)
       values ($1, $2, $3, $4, $5, $6, 'open', now())`,
      [
        id,
        body.session_id ?? null,
        body.description,
        body.page_url,
        body.browser_info,
        screenshotPath,
      ]
    );

    res.status(201).json({
      success: true,
      data: { id, screenshotPath },
    });
  })
);

export default router;
