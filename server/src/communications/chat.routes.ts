import { Router } from "express";
import { chatSendSchema } from "./communications.validators";
import { ChatService } from "./chat.service";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const chatService = new ChatService();

router.use(requireAuth);

router.post("/send", async (req, res, next) => {
  try {
    const payload = chatSendSchema.parse(req.body);
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
