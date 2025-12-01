import { Router } from "express";
import communicationController from "../controllers/communicationController.js";

const router = Router();

// Only sendMessage is real
router.post("/", communicationController.sendMessage);

export default router;
