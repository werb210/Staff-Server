import { Router } from "express";
import {
  sendSMS,
  sendEmail,
} from "../controllers/communicationController.js";

const router = Router();

router.post("/:silo/sms", sendSMS);
router.post("/:silo/email", sendEmail);

export default router;
