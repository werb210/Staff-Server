import { Router } from "express";
import { withRetry } from "../utils/retry";
import { createSupportThread } from "../services/supportService";

const router = Router();

router.post("/human", async (req, res) => {
  const { message, user } = req.body as {
    message?: string;
    user?: string;
  };

  await withRetry(async () => {
    await createSupportThread({
      type: "chat_escalation",
      description: message ?? "Human support request",
      source: user ?? "unknown",
    });
  });

  console.log("Human chat request:", message);
  res.json({ success: true });
});

router.post("/report", async (req, res) => {
  const { message, screenshot, route } = req.body as {
    message?: string;
    screenshot?: string;
    route?: string;
  };

  await withRetry(async () => {
    await createSupportThread({
      type: "issue_report",
      ...(message ? { description: message } : {}),
      ...(screenshot ? { screenshotBase64: screenshot } : {}),
      ...(route ? { route } : {}),
    });
  });

  console.log("Issue reported:", message);
  res.json({ success: true });
});

export default router;
