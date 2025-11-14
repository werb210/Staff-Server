import { Router } from "express";
import { triggerNotification } from "../controllers/notificationsController.js";

const router = Router();

router.post("/:silo", triggerNotification);

export default router;
