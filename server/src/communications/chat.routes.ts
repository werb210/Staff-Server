import { Router } from "express";
import { chatSendSchema } from "./communications.validators";
import { ChatService } from "./chat.service";
import { requireAuth } from "../middleware/requireAuth";
import { BadRequest } from "../errors";

const router = Router();
const chatService = new ChatService();

router.use(requireAuth);

router.post("/send", async (req, res, next) => {
  try {
    const payload = chatSendSchema.parse(req.body);

    if (!payload.applicationId || !payload.body || !payload.direction) {
      throw new BadRequest("invalid chat payload");
    }

    const record = await chatService.sendMessage({
      applicationId: payload.applicationId,
      direction: payload.direction,
      body: payload.body,
      issueReport: payload.issueReport,
    });
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
