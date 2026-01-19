import { Router } from "express";

const router = Router();

router.post("/start", async (_req, res) => {
  return res.status(204).send();
});

router.post("/verify", async (_req, res) => {
  return res.status(204).send();
});

export default router;
