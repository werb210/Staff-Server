// server/src/routes/auth.routes.ts
import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authGuard, roleGuard } from "../middlewares/index.js";

const router = Router();

router.post("/register", authGuard, roleGuard(["ADMIN"]), authController.register);
router.post("/login", authController.login);

export default router;
