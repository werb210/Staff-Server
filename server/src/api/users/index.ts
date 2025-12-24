import { Router, Request, Response } from "express";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  // existing create user logic stays here
  res.status(201).json({ created: true });
});

export default router;
