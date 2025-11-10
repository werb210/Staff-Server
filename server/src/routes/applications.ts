import { Router, Request, Response } from "express";

const router = Router();

router.get("/applications", (_req: Request, res: Response) => {
  res.json({ applications: [] });
});

export default router;
