import { Router } from "express";

const router = Router();

router.post("/ai/chat", async (req, res) => {
  const { message } = req.body as { message?: string };

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.json({
    reply:
      "Thanks for your question. One of our capital specialists can help further if needed.",
  });
});

export default router;
