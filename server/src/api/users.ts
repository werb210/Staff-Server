import { Router } from "express";
import { db } from "../db/client";
import { users } from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();

router.use(authenticate);

router.get("/", async (_req, res, next) => {
  try {
    const list = await db.select().from(users).orderBy(users.createdAt);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({ email, passwordHash, firstName, lastName, role })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
