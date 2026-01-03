import express from "express";
import { login } from "../modules/auth/auth.service";
import type { AuthLoginRequestBody, AuthLoginErrorResponse, AuthLoginResponse } from "../modules/auth/auth.types";

const router = express.Router();

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token }
 */
router.post("/login", async (req, res) => {
  const body = (req.body ?? {}) as AuthLoginRequestBody;

  try {
    const result = await login(body.email, body.password);

    if (result === "missing_fields") {
      const payload: AuthLoginErrorResponse = { error: "missing_fields" };
      return res.status(400).json(payload);
    }

    if (result === "invalid_credentials") {
      const payload: AuthLoginErrorResponse = { error: "invalid_credentials" };
      return res.status(401).json(payload);
    }

    const payload: AuthLoginResponse = result;
    return res.status(200).json(payload);
  } catch (err) {
    console.error("Auth login failed:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
