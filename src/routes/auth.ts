import { Router } from "express";
import { getUserByEmail } from "../modules/auth/auth.repo";

const router = Router();

router.post("/login", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email required" });
  }

  const user = await getUserByEmail(email);

  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  return res.json({ ok: true, user });
});

export default router;
