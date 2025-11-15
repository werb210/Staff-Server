import type { Request, Response } from "express";
import {
  hashPassword,
  verifyPassword,
  findUserByEmail,
  findUserById,
  signJwt,
  sanitizeUser,
} from "../services/index.js";
import { requirePrismaClient } from "../services/prismaClient.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });

  const token = signJwt(sanitizeUser(user));
  return res.json({ token, user: sanitizeUser(user) });
}

export async function createUser(req: Request, res: Response) {
  const { email, password, role, silos } = req.body ?? {};
  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Email, password, and role are required" });
  }

  if (!Array.isArray(silos)) {
    return res.status(400).json({ error: "Silos must be an array" });
  }

  const passwordHash = await hashPassword(password);

  const prisma = await requirePrismaClient();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      silos,
    },
  });

  return res.json(sanitizeUser(user));
}

export async function me(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (!user.id) return res.json(user);

  const fullUser = await findUserById(user.id);
  if (!fullUser) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(sanitizeUser(fullUser));
}
