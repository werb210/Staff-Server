import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";
import { safeHandler } from "../middleware/safeHandler";
import { pool } from "../db";
import { postAiChat, postAiEscalate } from "../ai/aiChatController";
import { saveKnowledge } from "../services/aiKnowledgeService";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const uploadDir = path.join(process.cwd(), "uploads", "ai-issues");

function ensureUploadDir(): void {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

router.post("/chat", requireAuth, postAiChat);
router.post("/escalate", requireAuth, postAiEscalate);

router.post(
  "/knowledge",
  safeHandler(async (req, res) => {
    const { title, content, sourceType } = req.body as {
      title?: string;
      content?: string;
      sourceType?: "spec_sheet" | "faq" | "internal" | "product";
    };

    if (!title || !content) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    await saveKnowledge({
      title,
      content,
      ...(sourceType ? { sourceType } : {}),
    });
    res.json({ success: true });
  })
);

router.post(
  "/report-issue",
  requireAuth,
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
        code: "invalid_request",
        message: "description, page_url, and browser_info are required",
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

    res.status(201).json({ ok: true, id, screenshotPath });
  })
);

export default router;
