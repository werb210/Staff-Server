import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getMe,
  updateMe,
  listUsers,
  adminUpdateUser,
} from "../services/users.service";

const router = Router();

/**
 * Self profile
 */
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);

/**
 * Admin user management
 */
router.get("/", requireAuth, requireAdmin, listUsers);
router.patch("/:id", requireAuth, requireAdmin, adminUpdateUser);

export default router;
