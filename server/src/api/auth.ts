import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { companies, users } from "../db/schema";
import { config } from "../config/config";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }
    let companyId: string | null = null;
    if (companyName) {
      const [company] = await db
        .insert(companies)
        .values({ name: companyName })
        .returning({ id: companies.id });
      companyId = company.id;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({ email, passwordHash, firstName, lastName, companyId: companyId ?? undefined })
      .returning({ id: users.id, email: users.email, role: users.role });
    const token = jwt.sign({ id: created.id, email: created.email, role: created.role }, config.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({ token, user: created });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }
    const [user] = await db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash, role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

export default router;
