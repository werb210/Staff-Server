import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const users = req.silo!.services.users.listUsers();
  res.json({ message: "OK", data: users });
});

router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["admin", "manager", "agent"]),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid user payload" });
  }
  const user = req.silo!.services.users.createUser(payload.data);
  res.status(201).json({ message: "OK", data: user });
});

router.get("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  const user = req.silo!.services.users.getUser(id.data);
  res.json({ message: "OK", data: user });
});

export default router;
