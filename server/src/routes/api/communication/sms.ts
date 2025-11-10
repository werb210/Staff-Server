import { Router } from "express";
import { twilioService } from "../../../services/twilioService.js";

const router = Router();

/**
 * GET /api/communication/sms
 * Returns stubbed SMS messages so tests can verify the endpoint is reachable.
 */
router.get("/", (_req, res) => {
  const messages = twilioService.listSmsMessages();
  res.json({ message: "SMS messages retrieved", messages });
});

export default router;
