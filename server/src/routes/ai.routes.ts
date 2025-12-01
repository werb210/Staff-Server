import { Router } from "express";
import aiController from "../controllers/aiController.js";

const router = Router();

// Only /test exists — remove all phantom routes
router.get("/test", aiController.test);

export default router;
