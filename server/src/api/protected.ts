import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/admin-check", (req, res) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  res.json({ scope: "admin" });
});

export default router;
