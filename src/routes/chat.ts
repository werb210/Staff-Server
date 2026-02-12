import { Router } from "express";
import { createSupportThread } from "../services/supportService";
import { pushLeadToCRM } from "../services/crmWebhook";

const router = Router();

router.post("/escalate", async (req, res) => {
  const { sessionId, transcript, source } = req.body as {
    sessionId?: string;
    transcript?: unknown;
    source?: string;
  };

  await createSupportThread({
    type: "chat_escalation",
    ...(source ? { source } : {}),
    transcript: {
      sessionId: sessionId ?? null,
      transcript: transcript ?? null,
    },
  });

  await pushLeadToCRM({
    type: "chat_escalation",
    sessionId: sessionId ?? null,
    source: source ?? null,
    transcript: transcript ?? null,
  });

  res.json({ escalated: true });
});

export default router;
