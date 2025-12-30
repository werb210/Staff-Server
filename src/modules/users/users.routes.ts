import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { getUsersStatus } from "./users.service";

const router = Router();

router.get("/", requireAuth, (_req, res) => {
  res.json(getUsersStatus());
});

export default router;
