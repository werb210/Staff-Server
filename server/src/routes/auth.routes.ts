// server/src/routes/auth.routes.ts
import { Router } from "express";
import authController from "../controllers/authController.js";

const router = Router();

// Only login exists
router.post("/login", authController.login);

export default router;
