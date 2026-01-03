import { Router } from "express";
import { loginUser } from "./auth.service";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "missing_credentials" });
    }

    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_credentials") {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    res.status(500).json({ error: "server_error" });
  }
});

export default router;
