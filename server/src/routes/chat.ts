// server/src/routes/chat.ts
import { Router } from "express";
import chatController from "../controllers/chatController.js";
import { authGuard } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/application/:applicationId", authGuard, chatController.list);
router.post("/", authGuard, chatController.send);

export default router;
