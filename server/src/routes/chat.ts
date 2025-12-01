import { Router } from "express";
import chatController from "../controllers/chatController.js";
import authGuard from "../middlewares/authGuard.js";

const router = Router();

// Two real methods: list + send
router.get("/", authGuard, chatController.list);
router.post("/", authGuard, chatController.send);

export default router;
