import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    message: "OK",
    silo: req.silo?.silo ?? "unknown",
    auth: req.silo?.auth.describe(),
  });
});

export default router;
