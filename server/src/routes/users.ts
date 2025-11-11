import { Router } from "express";

const router = Router();
const users: Record<string, any> = {};

// GET all users
router.get("/", (_req, res) => {
  res.json(Object.values(users));
});

// POST new user
router.post("/", (req, res) => {
  const id = `${Date.now()}`;
  const userData = { id, ...req.body };
  users[id] = userData;
  res.status(201).json(userData);
});

export default router;
