import { Router } from "express";
import { communicationController } from "../controllers/communicationController";

const router = Router();

router.get("/sms", communicationController.listSMS);
router.get("/emails", communicationController.listEmails);

export default router;
