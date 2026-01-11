import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { dbQuery } from "../../db";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ code: "missing_credentials" });
    }

    const result = await dbQuery(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ code: "invalid_credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ code: "invalid_credentials" });
    }

    return res.json({
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ code: "server_error" });
  }
}
