import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

// TEMP STUB — prevents 404s from portal
router.get("/", async (_req, res) => {
  res.json([]);
});

export default router;
