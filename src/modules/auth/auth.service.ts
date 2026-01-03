import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findAuthUserByEmail } from "./auth.repo";
import type { AuthLoginError, AuthLoginResponse } from "./auth.types";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export async function login(email?: string, password?: string): Promise<AuthLoginResponse | AuthLoginError> {
  if (!email || !password) return "missing_fields";

  const user = await findAuthUserByEmail(email);
  if (!user) return "invalid_credentials";

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return "invalid_credentials";

  const token = jwt.sign({ sub: user.id }, getJwtSecret(), { expiresIn: "7d" });
  return { token };
}
