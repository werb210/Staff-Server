import { Router } from "express";
import { loginUser } from "./auth.service";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "missing_credentials" });
    }

    const user = await loginUser(email, password);
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: "invalid_credentials" });
  }
});

export default router;
