import { Router } from "express";
import { loginUser } from "../modules/auth/auth.service";

const router = Router();

/**
 * POST /api/auth/login
 */
router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "missing_credentials" });
  }

  return loginUser(email, password)
    .then((user) => res.json({ user }))
    .catch((err: unknown) => {
      if (err instanceof Error && err.message === "invalid_credentials") {
        return res.status(401).json({ error: "invalid_credentials" });
      }

      return res.status(500).json({ error: "server_error" });
    });
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

/**
 * GET /api/auth/me
 */
router.get("/me", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

export default router;
