import { Router, Request, Response } from "express";

const router = Router();

router.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default router;
