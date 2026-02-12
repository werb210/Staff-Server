import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";
import { safeHandler } from "../middleware/safeHandler";
import { pool } from "../db";
import { postAiChat, postAiEscalate } from "../ai/aiChatController";
import { saveKnowledge as saveKnowledgeDb } from "../services/aiKnowledgeService";
import { loadKnowledge, saveKnowledge } from "../modules/ai/knowledge.service";
import { AIKnowledgeController, upload as knowledgeUpload } from "../modules/ai/knowledge.controller";

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

router.post("/chat", postAiChat);
router.post("/escalate", postAiEscalate);

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
