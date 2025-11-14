import { Router } from "express";
import { sendSMS, sendEmail } from "../controllers/communicationController.js";

const router = Router({ mergeParams: true });

router.post("/sms", sendSMS);
router.post("/email", sendEmail);

export default router;
