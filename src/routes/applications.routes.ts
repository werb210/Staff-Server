import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json([]);
});

router.post("/", (req, res) => {
  res.json({
    id: "app-1",
    ...req.body,
  });
});

export default router;
