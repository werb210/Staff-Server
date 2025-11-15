import { Router } from "express";
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePrismaClient } from "../services/prismaClient.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const prisma = await requirePrismaClient();
  const companies = await prisma.company.findMany({
    where: {
      silo: { in: user.silos },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(companies);
});

export default router;
