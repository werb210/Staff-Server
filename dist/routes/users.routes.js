import { Router } from "express";
import { me } from "../auth/auth.controller";
import { requireAuth } from "../middleware/requireAuth";
const router = Router();
router.get("/me", requireAuth, me);
export default router;
