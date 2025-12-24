import { Router, type Request, type Response } from "express";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  res.json({ ok: true });
});

export default router;
