import { Router } from "express";

const router = Router();

router.post("/", async (req, res) => {
  const { revenue, years, credit } = req.body as {
    revenue?: number;
    years?: number;
    credit?: number;
  };

  let score = 0;
  if (typeof revenue === "number" && revenue > 500000) score += 30;
  if (typeof years === "number" && years > 2) score += 30;
  if (typeof credit === "number" && credit > 650) score += 40;

  res.json({ score });
});

export default router;
