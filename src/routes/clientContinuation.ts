import { Router } from "express";
import { getContinuation } from "../models/continuation";

const router = Router();

router.get("/:token", async (req, res) => {
  const token = req.params.token;
  const applicationId = await getContinuation(token);

  if (!applicationId) {
    res.status(404).json({ error: "Invalid token" });
    return;
  }

  res.json({ applicationId });
});

export default router;
