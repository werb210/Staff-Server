import { Router } from "express";
import { emailService } from "../../../services/emailService.js";

const router = Router();

/**
 * GET /api/communication/email
 * Provides a stubbed list of recently sent emails.
 */
router.get("/", (_req, res) => {
  const emails = emailService.listEmails();
  res.json({ message: "Emails retrieved", emails });
});

export default router;
