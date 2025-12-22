import { Router } from "express";
import { signJwt } from "../services/jwt.service";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // TEMP: replace with DB lookup
  if (email !== "todd.w@boreal.financial" || password !== "1Sucker1!") {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signJwt({ email });
  return res.json({ token });
});

export default router;
