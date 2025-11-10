import { Router } from "express";
import { twilioService } from "../../../services/twilioService.js";

const router = Router();

/**
 * GET /api/communication/calls
 * Returns stubbed call logs from the Twilio service.
 */
router.get("/", (_req, res) => {
  const calls = twilioService.listCallLogs();
  res.json({ message: "Call logs retrieved", calls });
});

export default router;
