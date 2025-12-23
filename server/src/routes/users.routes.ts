import { Router } from "express";

import { db } from "../db/index.js";

const router = Router();

router.get("/", (_req, res) => {
  const users = db.users.map(({ id, email }) => ({ id, email }));
  res.json(users);
});

router.get("/:id", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ id: user.id, email: user.email });
});

export default router;
