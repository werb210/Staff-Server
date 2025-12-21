import { Router } from "express";
import { login } from "./login";
import { me } from "./me";
import { requireAuth } from "../../middleware/auth";
const router = Router();
router.post("/login", login);
router.get("/me", requireAuth, me);
export default router;
