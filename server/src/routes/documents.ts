import { Router } from "express";
const router = Router();

// GET handler
router.get("/", (_req, res) => {
  res.json({ message: "OK" });
});

// POST handler for testing
router.post("/", (req, res) => {
  res.json({ message: "OK" });
});

export default router;
