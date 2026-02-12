import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  const { revenue, timeInBusiness, creditScore } = req.body as {
    revenue?: number;
    timeInBusiness?: number;
    creditScore?: number;
  };

  let score = 0;

  if (typeof revenue === "number" && revenue > 100000) score += 30;
  if (typeof timeInBusiness === "number" && timeInBusiness > 24) score += 30;
  if (typeof creditScore === "number" && creditScore > 650) score += 40;

  const rating =
    score >= 80 ? "Strong" :
    score >= 50 ? "Moderate" :
    "Needs Improvement";

  res.json({ score, rating });
});

export default router;
