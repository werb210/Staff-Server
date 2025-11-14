import { Router } from "express";
import { login, createUser, me } from "../controllers/authController.js";
import { requireAuth } from "../auth/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.post("/users", requireAuth, createUser);
router.get("/me", requireAuth, me);

export default router;
