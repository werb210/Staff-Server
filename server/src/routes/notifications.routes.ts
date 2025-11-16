// server/src/routes/notifications.routes.ts
import { Router } from "express";
import { notificationsController } from "../controllers/notificationsController.js";

const router = Router();

router.get("/", notificationsController.all);

export default router;
