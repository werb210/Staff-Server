import { Router } from "express";
import { triggerNotification } from "../controllers/notificationsController.js";

const router = Router({ mergeParams: true });

router.post("/", triggerNotification);

export default router;
