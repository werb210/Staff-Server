import { Router } from "express";
import type { Silo } from "../types/index.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { requirePrismaClient } from "../services/prismaClient.js";

const router = Router();

type CreateContactPayload = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  silo?: unknown;
};

const isSilo = (value: unknown): value is Silo =>
  typeof value === "string" && ["BF", "BI", "SLF"].includes(value);

router.get("/", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const prisma = await requirePrismaClient();
  const contacts = await prisma.contact.findMany({
    where: {
      silo: { in: user.silos },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(contacts);
});

router.post("/", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { firstName, lastName, email, phone, silo } =
    req.body as CreateContactPayload;

  if (typeof firstName !== "string" || typeof lastName !== "string") {
    return res.status(400).json({ error: "Missing contact name" });
  }

  if (!isSilo(silo)) {
    return res.status(400).json({ error: "Invalid silo" });
  }

  if (!user.silos.includes(silo)) {
    return res.status(403).json({ error: "Silo access denied" });
  }

  const prisma = await requirePrismaClient();
  const contact = await prisma.contact.create({
    data: {
      firstName,
      lastName,
      email: typeof email === "string" ? email : null,
      phone: typeof phone === "string" ? phone : null,
      silo,
    },
  });

  return res.status(201).json(contact);
});

router.get("/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const prisma = await requirePrismaClient();
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
  });

  if (!contact) {
    return res.status(404).json({ error: "Not found" });
  }

  if (!user.silos.includes(contact.silo)) {
    return res.status(403).json({ error: "Silo access denied" });
  }

  return res.json(contact);
});

export default router;
