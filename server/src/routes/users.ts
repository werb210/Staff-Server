import { Router } from "express";

import { userService } from "../services/userService.js";

const router = Router();

router.get("/", (_req, res) => {
  const users = userService.listUsers();
  res.json({ message: "OK", users });
});

router.post("/", (req, res, next) => {
  try {
    const user = userService.upsertUser(req.body);
    res.status(201).json({ message: "OK", user });
  } catch (error) {
    next(error);
  }
});

export default router;
