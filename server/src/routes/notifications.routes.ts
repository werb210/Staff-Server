import { Router } from "express";
import { triggerNotification } from "../controllers/index.js";

const router = Router({ mergeParams: true });

router.post("/", triggerNotification);

export default router;
