import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dbQuery } from "../db";

const router = Router();

router.post("/", async (req, res) => {
  const { message, screenshot, pageUrl, browserInfo, sessionId } = req.body as {
    message?: string;
    screenshot?: string;
    pageUrl?: string;
    browserInfo?: string;
    sessionId?: string;
  };

  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  await dbQuery(
    `insert into issue_reports
      (id, session_id, description, page_url, browser_info, screenshot_path, status)
     values ($1, $2, $3, $4, $5, $6, 'open')`,
    [
      randomUUID(),
      sessionId ?? null,
      message,
      pageUrl ?? "unknown",
      browserInfo ?? "unknown",
      screenshot ?? null,
    ]
  );

  return res.json({ success: true });
});

export default router;
