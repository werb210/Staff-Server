import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();

const DB_TIMEOUT_MS = 5000;

router.post("/login", async (req, res) => {
  let responded = false;

  const safeSend = (status: number, body: any) => {
    if (responded) return;
    responded = true;
    res.status(status).json(body);
  };

  const { email, password } = req.body || {};

  if (!email || !password) {
    return safeSend(400, { error: "missing_fields" });
  }

  let user;
  try {
    const dbPromise = pool.query(
      "SELECT id, password_hash FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB_TIMEOUT")), DB_TIMEOUT_MS)
    );

    const result: any = await Promise.race([dbPromise, timeoutPromise]);

    if (!result || result.rowCount === 0) {
      return safeSend(401, { error: "invalid_credentials" });
    }

    user = result.rows[0];
  } catch (err: any) {
    if (err.message === "DB_TIMEOUT") {
      console.error("AUTH_LOGIN_DB_TIMEOUT");
      return safeSend(503, { error: "db_timeout" });
    }

    console.error("AUTH_LOGIN_DB_ERROR", err);
    return safeSend(500, { error: "db_error" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return safeSend(401, { error: "invalid_credentials" });
  }

  try {
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "8h" }
    );

    return safeSend(200, { token });
  } catch (err) {
    console.error("AUTH_LOGIN_JWT_ERROR", err);
    return safeSend(500, { error: "jwt_error" });
  }
});

export default router;
