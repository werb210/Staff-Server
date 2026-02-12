import { Router } from "express";
import { createSupportThread } from "../services/supportService";

const router = Router();

router.post("/report", async (req, res) => {
  const { description, screenshotBase64, route } = req.body as {
    description?: string;
    screenshotBase64?: string;
    route?: string;
  };

  await createSupportThread({
    type: "issue_report",
    ...(description ? { description } : {}),
    ...(screenshotBase64 ? { screenshotBase64 } : {}),
    ...(route ? { route } : {}),
  });

  res.json({ received: true });
});

export default router;
