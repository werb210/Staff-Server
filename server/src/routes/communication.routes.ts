import { Router } from "express";
import {
  sendSMS,
  listSMSThreads,
  sendEmail,
  listEmailThreads,
} from "../controllers/communication/communicationController.js";

const router = Router();

// /communication/sms/silo/BF
router.get("/sms/silo/:silo", listSMSThreads);

// /communication/sms
router.post("/sms", sendSMS);

// /communication/email/silo/BF
router.get("/email/silo/:silo", listEmailThreads);

// /communication/email
router.post("/email", sendEmail);

export default router;
