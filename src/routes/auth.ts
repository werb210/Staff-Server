import { Router } from "express";
import { login } from "../modules/auth/auth.service";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await login(email, password);
  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  res.json(user);
});

export default router;
