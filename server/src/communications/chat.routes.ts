import { Router } from "express";
import { chatSendSchema } from "./communications.validators";
import { ChatService } from "./chat.service";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const chatService = new ChatService();

router.use(requireAuth);

router.post("/send", async (req, res, next) => {
  try {
    const parsed = chatSendSchema.parse(req.body);

    if (!parsed.applicationId || !parsed.direction || !parsed.body) {
      return res
        .status(400)
        .json({ error: "applicationId, direction, and body are required" });
    }

    const payload: Parameters<(typeof chatService)["sendMessage"]>[0] = {
      applicationId: parsed.applicationId,
      direction: parsed.direction,
      body: parsed.body,
      issueReport: parsed.issueReport ?? false,
    };

    const record = await chatService.sendMessage(payload);
    res.json({ ok: true, record });
  } catch (err) {
    next(err);
  }
});

router.get("/thread/:applicationId", async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const records = await chatService.thread(applicationId);
    res.json({ ok: true, records });
  } catch (err) {
    next(err);
  }
});

export default router;
