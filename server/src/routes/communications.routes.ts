import { Router } from "express";
import { communicationController } from "../controllers/communicationController.js";

const router = Router();

router.get("/sms", communicationController.sms);
router.get("/email", communicationController.email);

export default router;
